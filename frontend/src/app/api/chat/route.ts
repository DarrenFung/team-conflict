import { timingSafeEqual } from "crypto";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { modules } from "@/modules/registry";
import { getOrCreateActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vertex } from "@/lib/vertex";
import { recommend } from "@/lib/recommend";
import { evaluateInputRequirements } from "@/lib/evaluate-inputs";

export const maxDuration = 120;

const COMPLETION_MARKER = "[COMPLETE]";

const SYSTEM_PROMPT = `You are a clinical intake assistant. Your job is to understand why the patient is seeking care and guide them to the right level of care.

## STEP 1 — TRIAGE

After the patient's first message, classify their concern into exactly one of these categories:

### EMERGENCY
Life-threatening symptoms requiring immediate action:
- Chest pain or pressure
- Difficulty breathing or shortness of breath
- Signs of stroke (sudden numbness, confusion, trouble speaking, severe headache)
- Severe or uncontrolled bleeding
- Loss of consciousness or altered mental status
- Severe allergic reaction (throat swelling, anaphylaxis)
- Suicidal ideation or intent to self-harm
- Severe abdominal pain with vomiting blood
- Poisoning or overdose

### CLINICAL
A specific medical symptom or health complaint that would benefit from structured clinical assessment — e.g. knee pain, persistent headache, rash, fever, cough lasting weeks, anxiety symptoms, dizziness.

### NON-CLINICAL
Anything else — benefits/coverage questions, prescription refills, finding a provider, general wellness advice, administrative requests, follow-ups on existing treatment.

---

## EMERGENCY PATH

If the patient describes emergency symptoms:
1. Acknowledge the severity immediately. Ask at most 1 critical safety question (e.g. "Are you safe right now?", "Is this happening right now?").
2. Write a brief clinician-facing summary with whatever information you have.
3. Call generate_recommendation immediately.
4. Present the recommendation and end with ${COMPLETION_MARKER}.

Do NOT call evaluate_input_requirements or any module tools. Do NOT ask extended follow-up questions. Speed saves lives.

## CLINICAL PATH

For clinical symptoms:
1. Ask 1-2 brief questions to clarify the chief complaint if needed (e.g. confirm which body part, how long it's been happening). Do NOT conduct a full history — the structured tool will handle that.
2. Call evaluate_input_requirements with a summary of what you know. Prepend the summary with "CLINICAL:".
3. The result includes an \`existingDocuments\` list — documents already on file. You can reference these when relevant.
4. The service will return required inputs (typically structured symptom capture via firsthxSymptomCapture). For each:
   - Briefly explain to the patient what you're about to ask for and why
   - Call the specified tool with the specified arguments
   - Wait for the result before proceeding
5. Once all required inputs are gathered, write a clinician-facing summary (Chief complaint, HPI, PMH, Medications, Allergies, Review of systems).
6. Call generate_recommendation with the summary.
7. Present the recommendation and end with ${COMPLETION_MARKER}.

## NON-CLINICAL PATH

For non-clinical concerns:
1. Ask only the minimum questions needed to understand the patient's core need — typically 1-2 questions, not a long interview. If the concern is clear from the first message (e.g. "find a physiotherapist covered by my benefits"), you may already have enough to proceed.
2. **Do NOT try to gather coverage details, provider names, or plan specifics through conversation.** Patients rarely know these off the top of their head. Instead, move quickly to requesting the actual documents — that's where the information lives.
3. Call evaluate_input_requirements with a summary of what you know. Prepend the summary with "NON-CLINICAL:".
4. The result includes an \`existingDocuments\` list — documents already on file. Mention them so the patient knows ("I can see you already have your health card on file").
5. If the service returns required inputs (e.g. document uploads for health card or benefits booklet), explain briefly why each document will help, then gather them.
6. Write a clinician-facing summary appropriate to their concern.
7. Call generate_recommendation with the summary.
8. Present the recommendation and end with ${COMPLETION_MARKER}.

## Available tools
${modules.map((m) => `- ${m.name}: ${m.description}`).join("\n")}
- evaluate_input_requirements: Evaluates what additional inputs are needed based on conversation context. Call ONCE after follow-up questions (Clinical and Non-Clinical paths only).
- generate_recommendation: Generates a care recommendation based on completed intake data. Call ONCE when ready to recommend. You MUST pass triageCategory ("clinical", "non-clinical", or "emerg") matching the triage path you followed.

## General rules
- Do not give medical advice, diagnoses, or treatment recommendations yourself — the recommendation tool handles that.
- After a tool returns, use its output as context — do not re-ask what it already captured.
- Do not emit ${COMPLETION_MARKER} before the recommendation has been presented.
- Do NOT call any tools during follow-up questioning — tools come after.`;

// Client-side module tools (no execute handler — rendered on the client)
const moduleTools = Object.fromEntries(
  modules.map((m) => [
    m.name,
    tool({
      description: m.description,
      inputSchema: m.argsSchema,
    }),
  ]),
);

export async function POST(req: Request) {
  const {
    messages,
    encounterId,
    anonymousAccessToken,
  }: { messages: UIMessage[]; encounterId?: string; anonymousAccessToken?: string } = await req.json();

  if (!encounterId) {
    return new Response("encounterId is required", { status: 400 });
  }

  const user = await getOrCreateActiveUser();

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { userId: true, anonymousAccessToken: true },
  });
  if (!encounter) {
    console.error(
      `[api/chat] encounter ${encounterId} not found (request user ${user.id})`,
    );
    return new Response(`Encounter ${encounterId} not found`, { status: 404 });
  }

  if (encounter.userId != null) {
    if (encounter.userId !== user.id) {
      console.error(
        `[api/chat] encounter ${encounterId} belongs to ${encounter.userId}, request user is ${user.id}`,
      );
      return new Response("Encounter belongs to a different user", { status: 403 });
    }
  } else {
    if (
      !encounter.anonymousAccessToken ||
      !anonymousAccessToken ||
      encounter.anonymousAccessToken.length !== anonymousAccessToken.length ||
      !timingSafeEqual(
        Buffer.from(encounter.anonymousAccessToken),
        Buffer.from(anonymousAccessToken),
      )
    ) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // Server-side tools — defined inside POST to close over encounterId and user
  const serverTools = {
    evaluate_input_requirements: tool({
      description:
        "Evaluate what additional inputs are needed based on conversation context. Call ONCE after follow-up questions (Clinical and Non-Clinical paths only — NOT for emergencies).",
      inputSchema: z.object({
        conversationSummary: z
          .string()
          .describe(
            "A thorough summary prefixed with the triage category (CLINICAL: or NON-CLINICAL:) followed by what you've learned from the conversation",
          ),
        chiefComplaint: z
          .string()
          .describe("The chief complaint or concern in a few words"),
      }),
      execute: async ({ conversationSummary, chiefComplaint }) => {
        return await evaluateInputRequirements({
          conversationSummary,
          chiefComplaint,
          userId: user.id,
        });
      },
    }),
    generate_recommendation: tool({
      description:
        "Generate a care recommendation based on completed intake data. Call this ONLY after all required inputs from Phase 2 are gathered and the clinician summary has been written.",
      inputSchema: z.object({
        symptoms: z
          .string()
          .describe(
            "The chief complaint — a short description of why the patient is seeking care",
          ),
        intakeSummary: z
          .string()
          .describe(
            "The complete clinician-facing intake summary you just wrote",
          ),
        triageCategory: z
          .enum(["clinical", "non-clinical", "emerg"])
          .describe(
            "The triage category you assigned in Step 1: 'clinical' for medical symptoms, 'non-clinical' for admin/benefits/refills, 'emerg' for emergencies",
          ),
        latitude: z
          .number()
          .optional()
          .describe("Patient latitude, if known"),
        longitude: z
          .number()
          .optional()
          .describe("Patient longitude, if known"),
      }),
      execute: async ({ symptoms, intakeSummary, triageCategory, latitude, longitude }) => {
        // Persist the triage category on the encounter
        await prisma.encounter.update({
          where: { id: encounterId },
          data: { encounterType: triageCategory },
        });

        const result = await recommend({
          symptoms,
          intakeSummary,
          location:
            latitude != null && longitude != null
              ? { lat: latitude, lon: longitude }
              : undefined,
          encounterId,
          userId: user.id,
        });

        // Persist the structured recommendation so the results page can load it
        await prisma.encounter.update({
          where: { id: encounterId },
          data: { recommendationPayload: JSON.parse(JSON.stringify(result)) },
        });

        return result;
      },
    }),
  };

  const tools = { ...moduleTools, ...serverTools };

  const result = streamText({
    model: vertex("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(20),
  });

  return result.toUIMessageStreamResponse();
}
