import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { vertex } from "@/lib/vertex";
import { prisma } from "@/lib/db";
import { modules } from "@/modules/registry";

const MODEL = "gemini-2.5-flash";

const requiredInputSchema = z.object({
  tool: z
    .string()
    .describe("The exact tool name to invoke (must match a registered module name)"),
  args: z
    .record(z.string(), z.unknown())
    .describe("The arguments object to pass to the tool"),
  reason: z
    .string()
    .describe("One-sentence explanation of why this input is needed for this patient"),
});

const outputSchema = z.object({
  requiredInputs: z
    .array(requiredInputSchema)
    .describe("Ordered list of tools to invoke. firsthxSymptomCapture should come first."),
  reasoning: z
    .string()
    .describe("Brief overall reasoning for the input requirements decision"),
});

export type EvaluateInputsResult = z.infer<typeof outputSchema>;

const AVAILABLE_TOOLS_DESCRIPTION = modules
  .map((m) => `- **${m.name}**: ${m.description}`)
  .join("\n");

const SYSTEM_PROMPT = `You are a clinical intake coordinator deciding what additional structured inputs are needed before generating a care recommendation.

## Available tools
${AVAILABLE_TOOLS_DESCRIPTION}

## Rules

1. **firsthxSymptomCapture is ALWAYS required.** Every intake needs structured symptom characterization. Set the \`symptomHint\` arg to a short description of the primary symptom (e.g. "knee pain", "headache", "anxiety").

2. **requestAttachmentUpload** — conditionally request document uploads. You may request:
   - **Health card** (\`id: "health_card"\`): Request when the recommendation may involve OHIP-covered services. Do NOT request if the user already has one on file.
   - **Benefits booklet** (\`id: "benefits_booklet"\`): Request when the issue might benefit from employer-covered services (physiotherapy, chiropractic, massage therapy, mental health counseling, EAP, etc.). Do NOT request if the user already has one on file. Skip for emergency/urgent situations where speed matters.

   If both are needed, combine them into a single \`requestAttachmentUpload\` call with multiple attachment entries.

3. **Ordering**: Always put firsthxSymptomCapture first, then requestAttachmentUpload (if needed).

4. **Output the exact tool names** as they appear above. Do not invent tool names.

## Output format
Return a JSON object with:
- \`requiredInputs\`: array of { tool, args, reason }
- \`reasoning\`: brief explanation of your decision`;

export type EvaluateInputsInput = {
  conversationSummary: string;
  chiefComplaint: string;
  userId: string;
};

export async function evaluateInputRequirements(
  input: EvaluateInputsInput,
): Promise<EvaluateInputsResult> {
  // Check what documents the user already has on file
  const existingAttachments = await prisma.attachment.findMany({
    where: { userId: input.userId },
    select: { description: true },
  });

  const existingDocs =
    existingAttachments.length > 0
      ? existingAttachments.map((a) => `- ${a.description}`).join("\n")
      : "(none)";

  const result = await generateText({
    model: vertex(MODEL),
    output: Output.object({ schema: outputSchema }),
    system: SYSTEM_PROMPT,
    prompt: `## Conversation Summary
${input.conversationSummary}

## Chief Complaint
${input.chiefComplaint}

## Documents already on file for this user
${existingDocs}`,
  });

  const output = result.output ?? {
    requiredInputs: [
      {
        tool: "firsthxSymptomCapture",
        args: { symptomHint: input.chiefComplaint },
        reason: "Structured symptom capture is always required",
      },
    ],
    reasoning: "Fallback: defaulting to firsthx only",
  };

  // Validate tool names against registry
  const validToolNames = new Set(modules.map((m) => m.name));
  const validated = output.requiredInputs.filter((req) => {
    if (!validToolNames.has(req.tool)) {
      console.warn(
        `[evaluate-inputs] Dropping unknown tool "${req.tool}" from requirements`,
      );
      return false;
    }
    return true;
  });

  console.log(
    `[evaluate-inputs] Required inputs: ${validated.map((r) => r.tool).join(", ")} | Reasoning: ${output.reasoning}`,
  );

  return { ...output, requiredInputs: validated };
}
