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

const SYSTEM_PROMPT = `You are a clinical intake assistant conducting a pre-visit health history. You follow a strict 3-phase protocol.

## PHASE 1 — FOLLOW-UP QUESTIONS
Ask conversational follow-up questions to understand the patient's issue. ONE question per turn. Be empathetic, concise, and use plain language.

Cover these areas as relevant:
- Onset and timeline
- Character and severity
- Location and radiation
- Aggravating and relieving factors
- Associated symptoms
- Prior treatments or self-care attempted
- Relevant past medical history
- Current medications
- Allergies
- Impact on daily activities

RULES FOR PHASE 1:
- Do NOT call any tools during this phase.
- Continue asking questions until you can confidently summarize the patient's issue, including enough detail for clinical decision-making.
- When you have sufficient context (typically 3-8 questions depending on complexity), transition to Phase 2 by calling evaluate_input_requirements.

## PHASE 2 — GATHER REQUIRED INPUTS
Call evaluate_input_requirements with a thorough summary of what you've learned. The tool returns a list of additional inputs to gather (e.g., structured symptom capture, document uploads).

For each required input in the returned list:
1. Briefly explain to the patient what you're about to ask for and why
2. Call the specified tool with the specified arguments
3. Wait for the tool result before proceeding to the next input

RULES FOR PHASE 2:
- Call evaluate_input_requirements exactly once.
- Invoke each tool the service says is required, in order.
- Do not skip any required input.
- Do not call generate_recommendation until all required inputs are gathered.
- After each tool completes, acknowledge the result briefly, then proceed to the next required input (or to Phase 3 if all are done).

## PHASE 3 — RECOMMENDATION
When all Phase 2 inputs are gathered:

1. Write a clinician-facing summary with these sections:
   - Chief complaint
   - HPI (history of present illness)
   - PMH (past medical history)
   - Medications
   - Allergies
   - Review of systems

2. Call generate_recommendation with the chief complaint and the full intake summary.

3. When the recommendation returns, present it to the patient clearly and reassuringly:
   - What level of care to seek
   - Where to go (specific providers if included)
   - Self-care measures in the meantime
   - Appropriate caveats

4. End the final turn with ${COMPLETION_MARKER} on its own line.

## Available tools
${modules.map((m) => `- ${m.name}: ${m.description}`).join("\n")}
- evaluate_input_requirements: Evaluates what additional inputs are needed based on conversation context. Call ONCE at the end of Phase 1.
- generate_recommendation: Generates a care recommendation based on completed intake data. Call ONCE in Phase 3 after all inputs are gathered.

## General rules
- Do not give medical advice, diagnoses, or treatment recommendations yourself — the recommendation tool handles that.
- After a tool returns, use its output as context — do not re-ask what it already captured.
- Do not emit ${COMPLETION_MARKER} before the recommendation has been presented.`;

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
        "Evaluate what additional inputs are needed based on conversation context. Call ONCE at the end of Phase 1.",
      inputSchema: z.object({
        conversationSummary: z
          .string()
          .describe(
            "A thorough summary of what you've learned about the patient's issue from the conversation so far",
          ),
        chiefComplaint: z
          .string()
          .describe("The chief complaint in a few words"),
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
        latitude: z
          .number()
          .optional()
          .describe("Patient latitude, if known"),
        longitude: z
          .number()
          .optional()
          .describe("Patient longitude, if known"),
      }),
      execute: async ({ symptoms, intakeSummary, latitude, longitude }) => {
        const result = await recommend({
          symptoms,
          intakeSummary,
          location:
            latitude != null && longitude != null
              ? { lat: latitude, lon: longitude }
              : undefined,
          encounterId,
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
