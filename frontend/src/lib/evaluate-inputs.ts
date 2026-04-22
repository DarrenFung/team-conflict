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

const llmOutputSchema = z.object({
  requiredInputs: z
    .array(requiredInputSchema)
    .describe("Ordered list of tools to invoke. firsthxSymptomCapture should come first."),
  reasoning: z
    .string()
    .describe("Brief overall reasoning for the input requirements decision"),
});

const resultSchema = llmOutputSchema.extend({
  existingDocuments: z
    .array(z.string())
    .describe("List of document descriptions already on file for this user"),
});

export type EvaluateInputsResult = z.infer<typeof resultSchema>;

const AVAILABLE_TOOLS_DESCRIPTION = modules
  .map((m) => `- **${m.name}**: ${m.description}`)
  .join("\n");

const SYSTEM_PROMPT = `You are a clinical intake coordinator deciding what additional structured inputs are needed before generating a care recommendation.

## Available tools
${AVAILABLE_TOOLS_DESCRIPTION}

## Triage categories

The conversation summary will be prefixed with a triage category. Use it to determine which tools are needed:

### CLINICAL (prefix "CLINICAL:")
The patient has a specific medical symptom or health complaint.
- **firsthxSymptomCapture is required.** Set the \`symptomHint\` arg to a short description of the primary symptom (e.g. "knee pain", "headache", "anxiety").
- **requestAttachmentUpload** — conditionally request document uploads:
  - **Health card** (\`id: "health_card"\`): Request when the recommendation may involve OHIP-covered services. Do NOT request if the user already has one on file.
  - **Benefits booklet** (\`id: "benefits_booklet"\`): Request when the issue might benefit from employer-covered services (physiotherapy, chiropractic, massage therapy, mental health counseling, EAP, etc.). Do NOT request if the user already has one on file.
  If both are needed, combine them into a single \`requestAttachmentUpload\` call with multiple attachment entries.

### NON-CLINICAL (prefix "NON-CLINICAL:")
The patient has a non-clinical concern (benefits, refills, finding a provider, administrative, etc.). The AI chatbot has already asked guided follow-up questions, so there is no need for structured symptom capture.
- **Do NOT include firsthxSymptomCapture.** The conversational follow-up already gathered the needed context.
- **requestAttachmentUpload** — proactively request uploads for documents NOT already on file that would help with the patient's concern:
  - **Health card** (\`id: "health_card"\`, \`label: "Health card"\`, \`description: "Photo of your Ontario health card (front)"\`, \`multiple: false\`): Request if the patient doesn't already have one on file. A health card helps verify coverage eligibility.
  - **Benefits booklet** (\`id: "benefits_booklet"\`, \`label: "Benefits booklet"\`, \`description: "Your employer benefits booklet or summary of coverage (PDF)"\`, \`multiple: true\`): Request if the patient doesn't already have one on file. Benefits info helps recommend covered services.
  Include both in a single \`requestAttachmentUpload\` call if neither is on file.
- Only return an empty requiredInputs array if both documents are already on file or if the concern is purely administrative (e.g. booking logistics) where documents wouldn't help.

## Rules
1. **Ordering**: Always put firsthxSymptomCapture first (if included), then requestAttachmentUpload (if needed).
2. **Output the exact tool names** as they appear above. Do not invent tool names.

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
  // Check what documents the user already has on file (across all encounters)
  const existingAttachments = await prisma.attachment.findMany({
    where: { userId: input.userId },
    select: { description: true, originalFilename: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate by description, keeping the most recent
  const seen = new Set<string>();
  const uniqueAttachments = existingAttachments.filter((a) => {
    if (seen.has(a.description)) return false;
    seen.add(a.description);
    return true;
  });

  const existingDocs =
    uniqueAttachments.length > 0
      ? uniqueAttachments.map((a) => `- ${a.description} (${a.originalFilename})`).join("\n")
      : "(none)";

  const result = await generateText({
    model: vertex(MODEL),
    output: Output.object({ schema: llmOutputSchema }),
    system: SYSTEM_PROMPT,
    prompt: `## Conversation Summary
${input.conversationSummary}

## Chief Complaint
${input.chiefComplaint}

## Documents already on file for this user
${existingDocs}`,
  });

  const isNonClinical = input.conversationSummary.startsWith("NON-CLINICAL:");

  const output = result.output ?? (isNonClinical
    ? {
        requiredInputs: [],
        reasoning: "Fallback: non-clinical concern, no structured symptom capture needed",
      }
    : {
        requiredInputs: [
          {
            tool: "firsthxSymptomCapture",
            args: { symptomHint: input.chiefComplaint },
            reason: "Structured symptom capture is required for clinical concerns",
          },
        ],
        reasoning: "Fallback: defaulting to firsthx for clinical concern",
      });

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

  const existingDocuments = uniqueAttachments.map((a) => `${a.description} (${a.originalFilename})`);

  return { ...output, requiredInputs: validated, existingDocuments };
}
