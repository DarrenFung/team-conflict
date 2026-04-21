import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VertexAIClient, type LocalFile } from "./vertex-ai-client.js";
import { createMapsTool } from "./maps-tool.js";

const SCRAPERS = join(import.meta.dirname, "../scrapers");
const ARTICLES_DIR = join(SCRAPERS, "health811/.articles");
const MANIFEST_PATH = join(SCRAPERS, "health811/manifest.md");
const ED_WAIT_TIMES = join(SCRAPERS, "hqontario/output/ed-wait-times.md");
const SCOPE_OF_PRACTICE = join(SCRAPERS, "scope_of_practice.md");
const DIVERSION_CONCERNS_CSV = join(SCRAPERS, "diversion-presenting-concerns.csv");
const DIVERSION_PRINCIPLES_CSV = join(SCRAPERS, "diversion-principles.csv");
const BENEFITS_PDF = join(process.env.HOME!, "Downloads/booklet.pdf");

const MAX_ARTICLES = 20;

const MODEL = process.env.VERTEX_MODEL ?? "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a Canadian healthcare navigation assistant. Your job is to help Ontario residents understand what kind of care they need based on their symptoms, and where they can access it.

You have access to the following sources of information:

1. **Benefits Booklet (PDF):** The caller's employee benefits plan. Use it to determine what services are covered, copay details, and any relevant plan limitations.

2. **Health811 Medical Library:** A curated set of articles from Ontario's Health811 service selected for relevance to the caller's symptoms. Each article describes a condition's overview, risks, symptoms, diagnosis, treatment, prevention, and prognosis. Use these to help identify what the caller's symptoms might indicate.

3. **Ontario ED Wait Times:** Current emergency department wait times across Ontario hospitals. Use this when recommending whether and where to seek emergency care.

4. **Scope of Practice:** A reference document describing what different Ontario healthcare practitioners (physicians, NPs, RNs, pharmacists, etc.) are authorized to do. Use this to recommend the right type of practitioner for the caller's needs.

5. **ED Diversion Criteria:** A table of presenting concerns with recommended diversion destinations (ER, Urgent Care, Walk-In Clinic) and timing (STAT, ASAP, Same day). Also includes diversion principles — conditions that should NOT be diverted from in-person care. Use this to determine the right care setting and urgency for the caller's symptoms.

6. **find_nearby_healthcare_provider tool:** If the caller's location is available, use this tool to search for nearby healthcare providers. Use it to find:
   - **Pharmacies** when pharmacy-based care is appropriate (minor ailment assessments, prescriptions)
   - **Private-pay practitioners** like chiropractors, physiotherapists, massage therapists, naturopaths, etc. when their services would help
   - **Walk-in clinics** when that level of care is appropriate
   The tool returns Google Maps results with ratings, reviews, driving distance and ETA from the caller's location. Prefer highly-rated providers that are close by.

## Your approach

1. **Listen carefully** to the caller's symptoms. Ask clarifying questions if critical details are missing (e.g., severity, duration, age, pre-existing conditions).

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
   - **IMPORTANT: If the caller's location is available, you MUST always use the find_nearby_healthcare_provider tool to recommend at least one specific nearby provider relevant to the level of care required.** For example: a nearby pharmacy for minor ailments, a physiotherapist for musculoskeletal issues, a walk-in clinic for moderate concerns, etc. Include their name, address, rating, and driving ETA in your recommendation.
   - What the benefits plan covers for the recommended care
   - Any self-care measures to take in the meantime

6. **Apply the coverage priority waterfall.** When recommending care, exhaust options in this order:
   1. **Publicly covered (OHIP/provincial):** Physician visits, ED, OHIP-covered clinics, pharmacist minor ailment assessments, etc.
   2. **Employer benefits:** Services covered by the caller's benefits plan (refer to the Benefits Booklet PDF) — e.g., paramedical practitioners, prescription drugs, vision, dental.
   3. **Private insurance:** Any additional private coverage the caller may have.
   4. **Lowest out-of-pocket:** If no coverage applies, guide the caller to the most affordable option.
   Always explain *why* a particular option is recommended at that tier. For example: "A pharmacist can assess this under Ontario's minor ailment program at no cost to you" before suggesting a paid walk-in visit.

7. **Add appropriate caveats:** You are not a doctor. This is informational guidance based on symptom descriptions. Always recommend professional medical evaluation for anything concerning.

## Tone
- Warm, calm, and reassuring — the caller may be anxious
- Clear and direct — don't bury the recommendation
- Use plain language — avoid medical jargon unless explaining a condition name
`;

// --- Article selection ---

async function selectArticles(
  client: VertexAIClient,
  symptoms: string
): Promise<string[]> {
  const manifest = readFileSync(MANIFEST_PATH, "utf-8");

  const response = await client.generateContent({
    systemInstruction: `You are a medical article selector. Given a patient's symptoms and a manifest of medical condition articles, select up to ${MAX_ARTICLES} articles that are most relevant to the symptoms described.

Respond with ONLY a JSON array of filenames, e.g.: ["acute-bronchitis.md", "pneumonia.md"]

Select articles that cover:
- Conditions that could directly cause the described symptoms
- Related or commonly confused conditions for differential diagnosis
- Any emergency conditions that share these symptoms and shouldn't be missed

Do not include any explanation, just the JSON array.`,
    prompt: `## Patient symptoms
${symptoms}

## Article manifest
${manifest}`,
    model: MODEL,
  });

  const match = response.match(/\[[\s\S]*\]/);
  if (!match) {
    console.error("Failed to parse article selection response:", response);
    return [];
  }

  const filenames: string[] = JSON.parse(match[0]);
  return filenames.slice(0, MAX_ARTICLES);
}

function loadArticles(filenames: string[]): string {
  const articles: string[] = [];
  for (const filename of filenames) {
    const filepath = join(ARTICLES_DIR, filename);
    try {
      articles.push(readFileSync(filepath, "utf-8"));
    } catch {
      console.warn(`Warning: article not found: ${filename}`);
    }
  }
  return articles.join("\n\n---\n\n");
}

// --- Main ---

async function main() {
  // Parse args: <symptoms> [--lat=N --lon=N]
  const args = process.argv.slice(2);
  let lat: number | undefined;
  let lon: number | undefined;
  const symptomParts: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--lat=")) {
      lat = parseFloat(arg.slice(6));
    } else if (arg.startsWith("--lon=")) {
      lon = parseFloat(arg.slice(6));
    } else {
      symptomParts.push(arg);
    }
  }

  const symptoms = symptomParts.join(" ");
  if (!symptoms) {
    console.error(
      "Usage: tsx --env-file=.env src/triage.ts <symptoms> [--lat=N --lon=N]"
    );
    console.error(
      'Example: tsx --env-file=.env src/triage.ts "I have a bad cough for 3 days" --lat=43.65 --lon=-79.38'
    );
    process.exit(1);
  }

  const hasLocation = lat !== undefined && lon !== undefined;
  if (hasLocation) {
    console.log(`Location: ${lat}, ${lon}`);
  } else {
    console.log("No location provided — skipping location-based recommendations");
  }

  const client = new VertexAIClient();

  // Step 1: Select relevant articles
  console.log("\nSelecting relevant articles from manifest...");
  const selectedFiles = await selectArticles(client, symptoms);
  console.log(`Selected ${selectedFiles.length} articles: ${selectedFiles.join(", ")}`);

  // Step 2: Load all context
  const articlesText = loadArticles(selectedFiles);
  console.log(`Loaded ${articlesText.length.toLocaleString()} chars of medical reference data`);

  const edWaitTimes = readFileSync(ED_WAIT_TIMES, "utf-8");
  const scopeOfPractice = readFileSync(SCOPE_OF_PRACTICE, "utf-8");
  const diversionConcerns = readFileSync(DIVERSION_CONCERNS_CSV, "utf-8");
  const diversionPrinciples = readFileSync(DIVERSION_PRINCIPLES_CSV, "utf-8");

  const userPrompt = `## Caller's reported symptoms

${symptoms}
${hasLocation ? `\n**Caller location:** ${lat}, ${lon}\n` : ""}
---

## Health811 Medical Reference Library

${articlesText}

---

## Ontario Practitioner Scope of Practice

${scopeOfPractice}

---

## ED Diversion Principles (do NOT divert these away from in-person care)

${diversionPrinciples}

---

## ED Diversion Presenting Concerns

${diversionConcerns}

---

## Ontario Emergency Department Wait Times

${edWaitTimes}`;

  const inlineFiles: LocalFile[] = [
    { path: BENEFITS_PDF, mimeType: "application/pdf" },
  ];

  // Set up tools — maps tool for location-based provider search
  const tools = hasLocation ? [createMapsTool()] : [];

  console.log(`\nTotal prompt size: ~${(userPrompt.length / 1000).toFixed(0)}K chars + 1 inline file`);
  if (tools.length) console.log("Tools: find_nearby_healthcare_provider (Google Maps)");
  console.log("Sending to Vertex AI...\n");

  // Step 3: Generate care recommendation (with automatic function calling for tools)
  const response = await client.generateContent({
    prompt: userPrompt,
    localFiles: inlineFiles,
    systemInstruction: SYSTEM_PROMPT,
    model: MODEL,
    tools,
  });

  console.log("=== Care Recommendation ===\n");
  console.log(response);
}

main().catch(console.error);
