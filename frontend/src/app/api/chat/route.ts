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

export const maxDuration = 120;

const COMPLETION_MARKER = "[COMPLETE]";

const SYSTEM_PROMPT = `You are a clinical intake assistant conducting a pre-visit health history. You have access to specialized tools for parts of the intake and orchestrate the conversation around them.

## Available tools
${modules.map((m) => `- ${m.name}: ${m.description}`).join("\n")}
- generate_recommendation: After completing the intake, call this tool to generate a care recommendation based on the patient's symptoms and intake data.

## Conversational rules
- Ask ONE question per turn. Plain language, empathetic, concise.
- Call a tool when it's the right fit. Don't re-ask questions the tool will cover.
- Do not give medical advice, diagnoses, or treatment recommendations yourself — the recommendation tool handles that.

## After a tool returns
Resume the conversation. Use the tool's output as context — do not re-ask what it already captured. Cover what's still missing (review of systems, relevant PMH, current medications, allergies). Call another tool if useful.

## Final summary & recommendation
When the intake is complete, output a clinician-facing summary with sections:
- Chief complaint
- HPI (history of present illness)
- PMH
- Medications
- Allergies
- Review of systems

Then immediately call the generate_recommendation tool with the chief complaint and the full intake summary you just wrote. When the recommendation comes back, present it to the patient in a clear, reassuring way:
- What level of care to seek
- Where to go (specific providers if the recommendation includes them)
- Self-care measures in the meantime
- Any appropriate caveats

End the final turn with ${COMPLETION_MARKER} on its own line. Do not emit that marker before the recommendation has been presented.`;

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

// Server-side tool — runs the recommendation subagent
const serverTools = {
  generate_recommendation: tool({
    description:
      "Generate a care recommendation based on completed intake data. Call this ONLY after the intake is complete and the clinician summary has been written. The tool analyzes the patient's needs against medical references, Ontario care options, and practitioner scope of practice.",
    inputSchema: z.object({
      symptoms: z
        .string()
        .describe("The chief complaint — a short description of why the patient is seeking care"),
      intakeSummary: z
        .string()
        .describe("The complete clinician-facing intake summary you just wrote"),
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
      });
      return result;
    },
  }),
};

const tools = { ...moduleTools, ...serverTools };

export async function POST(req: Request) {
  const {
    messages,
    encounterId,
  }: { messages: UIMessage[]; encounterId?: string } = await req.json();

  if (!encounterId) {
    return new Response("encounterId is required", { status: 400 });
  }

  const user = await getOrCreateActiveUser();

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { userId: true },
  });
  if (!encounter) {
    console.error(
      `[api/chat] encounter ${encounterId} not found (request user ${user.id})`,
    );
    return new Response(`Encounter ${encounterId} not found`, { status: 404 });
  }
  if (encounter.userId !== user.id) {
    console.error(
      `[api/chat] encounter ${encounterId} belongs to ${encounter.userId}, request user is ${user.id}`,
    );
    return new Response("Encounter belongs to a different user", { status: 403 });
  }

  const result = streamText({
    model: vertex("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(20),
  });

  return result.toUIMessageStreamResponse();
}
