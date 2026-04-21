import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { vertex } from "@/lib/vertex";
import { mapsTool } from "@/lib/maps";

const MODEL = "gemini-2.5-flash";
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

export type RecommendInput = {
  symptoms: string;
  intakeSummary: string;
  location?: { lat: number; lon: number };
  encounterId?: string;
};

export async function recommend(input: RecommendInput): Promise<string> {
  // 1. Load mandatory guidance resources
  const guidanceResources = await prisma.resource.findMany({
    where: { type: "guidance" },
  });

  // 2. Load all article titles for selection
  const articleIndex = await prisma.resource.findMany({
    where: { type: "article" },
    select: { id: true, title: true },
  });

  // 3. Select relevant articles via LLM
  const titleList = articleIndex
    .map((a) => `[${a.id}] ${a.title}`)
    .join("\n");

  const selectionResult = await generateText({
    model: vertex(MODEL),
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
${input.symptoms}

## Available articles
${titleList}`,
  });

  const selectedIds =
    selectionResult.output?.articleIds?.slice(0, MAX_ARTICLES) ?? [];

  console.log(
    `[recommend] Selected ${selectedIds.length} articles:`,
    selectedIds.map((id: number) => articleIndex.find((a) => a.id === id)?.title).filter(Boolean),
  );

  // 4. Load selected article content
  const selectedArticles =
    selectedIds.length > 0
      ? await prisma.resource.findMany({
          where: { id: { in: selectedIds } },
        })
      : [];

  // 5. Load patient documents (if encounter is known)
  let attachmentContext = "";
  if (input.encounterId) {
    const attachments = await prisma.attachment.findMany({
      where: { encounterId: input.encounterId },
      select: { description: true, originalFilename: true, contentType: true },
    });
    if (attachments.length > 0) {
      attachmentContext =
        "\n\n## Patient Documents on File\n" +
        attachments
          .map((a) => `- ${a.description}: ${a.originalFilename} (${a.contentType})`)
          .join("\n");
    }
  }

  // 6. Assemble context
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

  // 7. Generate recommendation
  const result = await generateText({
    model: vertex(MODEL),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    ...(input.location
      ? { tools: { find_nearby_healthcare_provider: mapsTool }, maxSteps: 5 }
      : {}),
  });

  return result.text;
}
