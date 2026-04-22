import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { vertex } from "@/lib/vertex";
import { mapsTool } from "@/lib/maps";
import { logCachedUsage } from "@/lib/llm-metrics";
import {
  recommendationPayloadSchema,
  type RecommendationPayload,
} from "@/types/recommendation";

// All recommend-path LLM calls run on flash-lite. The heavy-lifting
// clinical prompt already carries all the reference material, so the model
// is mostly summarizing/routing rather than reasoning from scratch.
const FAST_MODEL = "gemini-2.5-flash-lite";
const MAX_ARTICLES = 20;

const SYSTEM_PROMPT = `You are a Canadian healthcare navigation assistant. Your job is to help Ontario residents understand what kind of care they need based on their symptoms, and where they can access it.

You have access to the following sources of information:

1. **Health811 Medical Library:** A curated set of articles from Ontario's Health811 service selected for relevance to the caller's symptoms. Each article describes a condition's overview, risks, symptoms, diagnosis, treatment, prevention, and prognosis. Use these to help identify what the caller's symptoms might indicate.

2. **Ontario ED Wait Times:** Current emergency department wait times across Ontario hospitals. Use this when recommending whether and where to seek emergency care.

3. **Scope of Practice:** A reference document describing what different Ontario healthcare practitioners (physicians, NPs, RNs, pharmacists, etc.) are authorized to do. Use this to recommend the right type of practitioner for the caller's needs.

4. **ED Diversion Criteria:** A table of presenting concerns with recommended diversion destinations (ER, Urgent Care, Walk-In Clinic) and timing (STAT, ASAP, Same day). Also includes diversion principles — conditions that should NOT be diverted from in-person care. Use this to determine the right care setting and urgency for the caller's symptoms.

5. **find_nearby_healthcare_provider tool:** If the caller's location is available, use this tool to search for nearby healthcare providers. Use it to find:
   - **Pharmacies** when pharmacy-based care is appropriate (minor ailment assessments, prescriptions)
   - **Private-pay practitioners** like chiropractors, physiotherapists, massage therapists, naturopaths, etc. when their services would help
   - **Walk-in clinics** when that level of care is appropriate
   The tool returns Google Maps results with ratings, reviews, driving distance and ETA from the caller's location. Prefer highly-rated providers that are close by.

## Your approach

1. **Assess the intake data** carefully. The caller has already completed a clinical intake — use that structured data rather than asking follow-up questions.

2. **Check diversion criteria** first. If the symptoms match a presenting concern on the diversion list, recommend the appropriate alternative care setting instead of the ED.

3. **Assess urgency** based on the symptom descriptions, medical library, and diversion criteria:
   - **Emergency (call 911 / go to ED):** Life-threatening symptoms like chest pain, difficulty breathing, stroke signs, severe bleeding, loss of consciousness
   - **Urgent care / ED visit:** Serious but not immediately life-threatening — broken bones, deep cuts, high fever with other symptoms
   - **Pharmacy (minor ailment assessment):** Conditions within pharmacist scope of practice — UTIs, pink eye, mild skin conditions, etc.
   - **Walk-in clinic / virtual care:** Moderate symptoms that need attention but aren't emergencies — infections, rashes, persistent pain
   - **Private-pay practitioner:** Musculoskeletal issues, rehabilitation, chronic pain management — chiropractor, physiotherapist, massage therapist, etc.
   - **Family doctor / scheduled appointment:** Non-urgent, ongoing issues — mild chronic symptoms, follow-ups, preventive care
   - **Self-care at home:** Minor issues that typically resolve on their own — mild cold, minor scrapes

4. **Identify possible conditions** from the Health811 library that match the symptoms. Mention the most likely conditions and briefly explain why.

5. **Recommend next steps** clearly:
   - What level of care to seek and which practitioner type is appropriate (referencing scope of practice)
   - If ED is recommended, suggest hospitals with shorter wait times from the data available
   - **IMPORTANT: If the caller's location is available, you MUST always use the find_nearby_healthcare_provider tool to recommend at least one specific nearby provider relevant to the level of care required.**
   - Any self-care measures to take in the meantime

6. **Apply the coverage priority waterfall.** When recommending care, exhaust options in this order:
   1. **Publicly covered (OHIP/provincial):** Physician visits, ED, OHIP-covered clinics, pharmacist minor ailment assessments, etc.
   2. **Employer benefits:** Services covered by the caller's benefits plan if known.
   3. **Lowest out-of-pocket:** If no coverage applies, guide the caller to the most affordable option.
   Always explain *why* a particular option is recommended at that tier.

7. **Add appropriate caveats:** You are not a doctor. This is informational guidance based on symptom descriptions. Always recommend professional medical evaluation for anything concerning.

## Tone
- Warm, calm, and reassuring — the caller may be anxious
- Clear and direct — don't bury the recommendation
- Use plain language — avoid medical jargon unless explaining a condition name
`;

const STRUCTURING_SYSTEM_PROMPT = `You are a healthcare recommendation data structurer. Convert a natural-language healthcare recommendation and patient intake data into a structured JSON recommendation payload matching the output schema.

Guidelines:
- **profile**: Extract patient location, chief complaint, symptoms, and relevant history from the intake summary. Left column = "What you described" (symptoms, severity, key details). Right column = "What you've tried" (prior treatments, self-care attempts, or relevant negatives). Include badges for insurance plan (blue), urgency level (teal), and notable benefits like EAP (purple).
- **urgency**: Determine from the recommendation. "non-urgent" = routine care, "moderate" = should be seen soon, "urgent" = immediate/emergency. The message should explain the assessment in plain language.
- **recommendation**: The primary care pathway with 2-4 distinct action steps. Each step should have a clear title and 1-3 supporting bullet points with specific details (costs, timelines, coverage).
- **insights**: 2-3 key clinical insights. Include likelihood/probability bars where the recommendation suggests probability or effectiveness rates.
- **coverage**: Create plans based on the patient's known insurance plus OHIP and uninsured fallbacks. Each plan has coverage rows (what's covered and at what cost) and benefit actions (what the patient can do next). If the patient has employer insurance, list it first.
- **careResources**: 2-4 actionable next-step resources with clear titles and descriptions.
- **careSummary**: Sidebar with key stats (condition, severity, urgency, recommended care, estimated cost) plus a primary action button and secondary action links.
- **benefitsSnapshot**: Quick reference for relevant benefit balances. Only include if specific insurance/benefits details are known from the intake or uploaded documents.

Use plain, patient-facing language. Be specific about costs, coverage, and next steps where possible.`;

export type RecommendInput = {
  symptoms: string;
  intakeSummary: string;
  location?: { lat: number; lon: number };
  encounterId?: string;
  userId: string;
};

type FilePart = { type: "file"; data: Uint8Array; mediaType: string };

// Mime types Vertex Gemini accepts as file parts. Anything else (html,
// octet-stream, etc.) gets rejected mid-request, triggering a retry of the
// full 40K-token clinical prompt — so filter upfront.
const GEMINI_SUPPORTED_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

// Map common file extensions → Gemini-supported mime. Used to recover
// attachments uploaded as application/octet-stream (the browser's fallback
// when it can't identify the type).
const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
};

function resolveMediaType(
  rawMime: string,
  filename: string,
): string | null {
  if (GEMINI_SUPPORTED_MIMES.has(rawMime)) return rawMime;
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext];
  return null;
}

async function loadGuidance() {
  return prisma.resource.findMany({ where: { type: "guidance" } });
}

async function selectArticles(symptoms: string) {
  const articleIndex = await prisma.resource.findMany({
    where: { type: "article" },
    select: { id: true, title: true },
  });

  const titleList = articleIndex
    .map((a) => `[${a.id}] ${a.title}`)
    .join("\n");

  const selectionResult = await generateText({
    model: vertex(FAST_MODEL),
    output: Output.object({
      schema: z.object({
        articleIds: z
          .array(z.number())
          .describe(`Up to ${MAX_ARTICLES} article IDs most relevant to the symptoms`),
      }),
    }),
    system: `You are a medical article selector. Given a patient's symptoms and a list of medical condition articles, select up to ${MAX_ARTICLES} articles most relevant to the described symptoms.

Select articles that cover:
- Conditions that could directly cause the described symptoms
- Related or commonly confused conditions for differential diagnosis
- Any emergency conditions that share these symptoms and shouldn't be missed

Respond with the article IDs only.`,
    prompt: `## Patient symptoms
${symptoms}

## Available articles
${titleList}`,
  });

  const selectedIds =
    selectionResult.output?.articleIds?.slice(0, MAX_ARTICLES) ?? [];

  logCachedUsage("recommend-select", selectionResult.providerMetadata);
  console.log(
    `[recommend] Selected ${selectedIds.length} articles:`,
    selectedIds.map((id: number) => articleIndex.find((a) => a.id === id)?.title).filter(Boolean),
  );

  const selectedArticles =
    selectedIds.length > 0
      ? await prisma.resource.findMany({ where: { id: { in: selectedIds } } })
      : [];
  return selectedArticles;
}

async function loadAttachments(opts: {
  encounterId: string | undefined;
  userId: string;
}): Promise<{ attachmentContext: string; fileParts: FilePart[] }> {
  const allAttachments = await prisma.attachment.findMany({
    where: {
      OR: [
        ...(opts.encounterId ? [{ encounterId: opts.encounterId }] : []),
        { userId: opts.userId },
      ],
    },
    select: { url: true, description: true, originalFilename: true, contentType: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate by description — keep the most recent (already sorted desc)
  const seen = new Set<string>();
  const attachments = allAttachments.filter((a) => {
    if (seen.has(a.description)) return false;
    seen.add(a.description);
    return true;
  });

  if (attachments.length === 0) {
    return { attachmentContext: "", fileParts: [] };
  }

  const attachmentContext =
    "\n\n## Patient Documents Attached\n" +
    attachments
      .map((a) => `- ${a.description}: ${a.originalFilename} (${a.contentType})`)
      .join("\n") +
    "\n\nThe actual file contents are attached to this message. Review them as part of your assessment.";

  const downloadResults = await Promise.all(
    attachments.map(async (a) => {
      const rawMime = a.contentType;
      const mediaType = resolveMediaType(rawMime, a.originalFilename);
      if (!mediaType) {
        console.warn(
          `[recommend] Skipping ${a.originalFilename}: unsupported mime ${rawMime} (no extension fallback)`,
        );
        return null;
      }

      try {
        const result = await get(a.url, { access: "private" });
        if (!result) {
          console.warn(`[recommend] Blob not found for ${a.originalFilename}`);
          return null;
        }
        const data = new Uint8Array(await new Response(result.stream).arrayBuffer());
        if (data.byteLength === 0) {
          console.warn(`[recommend] Skipping empty attachment: ${a.originalFilename}`);
          return null;
        }
        // Prefer the resolved type; blob-metadata mime is sometimes the same
        // unsupported value we just mapped away from.
        return { type: "file" as const, data, mediaType };
      } catch (err) {
        console.warn(`[recommend] Failed to download attachment ${a.originalFilename}:`, err);
        return null;
      }
    }),
  );
  const fileParts = downloadResults.filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );
  return { attachmentContext, fileParts };
}

export async function recommend(input: RecommendInput): Promise<RecommendationPayload> {
  // Kick off the three independent pre-LLM chains in parallel:
  //   A. guidance resources (single DB read)
  //   B. article index → LLM selection → full article content (DB + LLM + DB)
  //   C. attachment rows → blob downloads (DB + N network fetches)
  // Chain B is typically the critical path; overlapping with C hides the
  // blob-download latency behind the selection LLM call.
  const [guidanceResources, selectedArticles, { attachmentContext, fileParts }] =
    await Promise.all([
      loadGuidance(),
      selectArticles(input.symptoms),
      loadAttachments({ encounterId: input.encounterId, userId: input.userId }),
    ]);

  // Assemble context
  const guidanceByTitle = Object.fromEntries(
    guidanceResources.map((r) => [r.title, r.content]),
  );

  const articlesText = selectedArticles
    .map((a) => a.content)
    .join("\n\n---\n\n");

  const userPrompt = `## Patient Intake Summary

${input.intakeSummary}

## Chief Complaint

${input.symptoms}
${input.location ? `\n**Patient location:** ${input.location.lat}, ${input.location.lon}\n` : ""}
---

## Health811 Medical Reference Library

${articlesText || "(No relevant articles found)"}

---

## Ontario Practitioner Scope of Practice

${guidanceByTitle["Scope of Practice"] ?? "(Not available)"}

---

## ED Diversion Principles (do NOT divert these away from in-person care)

${guidanceByTitle["ED Diversion Principles"] ?? "(Not available)"}

---

## ED Diversion Presenting Concerns

${guidanceByTitle["ED Diversion Presenting Concerns"] ?? "(Not available)"}${attachmentContext}`;

  // Generate recommendation — try with attachments, then progressively
  // drop files that Gemini can't process. Flash-lite with a tiny thinking
  // budget: the 40K-token prompt already contains all the clinical
  // reference material, so the model is mostly summarizing and routing,
  // not reasoning from scratch.
  const generateOptions = {
    model: vertex(FAST_MODEL),
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 512/c } },
    },
    system: SYSTEM_PROMPT,
    ...(input.location
      ? { tools: { find_nearby_healthcare_provider: mapsTool }, maxSteps: 5 }
      : {}),
  };

  const remainingParts = [...fileParts];
  let textRecommendation: string;

  // Phase 1: Generate text recommendation (with tools for provider search)
  while (true) {
    try {
      const note = remainingParts.length < fileParts.length && remainingParts.length === 0
        ? "\n\n(Note: The patient uploaded documents but they could not be processed. Base your recommendation on the intake summary and text context only.)"
        : "";
      const result = await generateText({
        ...generateOptions,
        messages: [
          {
            role: "user" as const,
            content: [
              { type: "text" as const, text: userPrompt + note },
              ...remainingParts,
            ],
          },
        ],
      });
      textRecommendation = result.text;
      logCachedUsage("recommend-text", result.providerMetadata);
      break;
    } catch (err) {
      if (remainingParts.length > 0) {
        // Drop the last file and retry — isolates which file Gemini can't process
        const dropped = remainingParts.pop()!;
        console.warn(
          `[recommend] Generation failed, dropping file (${dropped.mediaType}, ${dropped.data.byteLength} bytes). ${remainingParts.length} files remaining. Error:`,
          err instanceof Error ? err.message : err,
        );
        continue;
      }
      throw err;
    }
  }

  console.log(
    `[recommend] Phase 1 complete — text recommendation generated (${textRecommendation.length} chars)`,
  );

  // Phase 2: Structure the text recommendation into a RecommendationPayload.
  // Pure shape-transformation — no reasoning required, so run on flash-lite.
  const structuredResult = await generateText({
    model: vertex(FAST_MODEL),
    output: Output.object({ schema: recommendationPayloadSchema }),
    system: STRUCTURING_SYSTEM_PROMPT,
    prompt: `## Patient Intake Summary

${input.intakeSummary}

## Chief Complaint

${input.symptoms}
${input.location ? `\n**Patient location:** ${input.location.lat}, ${input.location.lon}\n` : ""}
---

## Generated Recommendation

${textRecommendation}`,
  });

  if (!structuredResult.output) {
    throw new Error("Failed to structure recommendation into payload");
  }

  logCachedUsage("recommend-structure", structuredResult.providerMetadata);
  console.log("[recommend] Phase 2 complete — structured payload generated");

  // Attach top 3 Health811 source articles used for this recommendation.
  // The selection LLM returns IDs roughly in relevance order, so take the
  // first 3 that matched actual articles.
  const HEALTH811_BASE =
    "https://health811.ontario.ca/static/guest/medical-library/condition?name=";
  const sourceArticles = selectedArticles.slice(0, 3).map((a) => ({
    title: a.title,
    url: `${HEALTH811_BASE}${encodeURIComponent(a.title)}`,
  }));

  return { ...structuredResult.output, sourceArticles };
}
