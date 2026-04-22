import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { vertex } from "@/lib/vertex";
import { prisma } from "@/lib/db";
import { modules } from "@/modules/registry";
import { logCachedUsage } from "@/lib/llm-metrics";

// Routing decision over a short rule table — flash-lite is plenty, and
// ~2-3× faster than flash with thinking disabled by default.
const MODEL = "gemini-2.5-flash-lite";

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
    .describe("Ordered list of tools to invoke (typically document upload requests)."),
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

const SYSTEM_PROMPT = `You are a clinical intake coordinator deciding what additional document uploads are needed before generating a care recommendation.

The AI chatbot has already conducted a thorough clinical interview with the patient. Your job is to determine whether supporting documents (health card, benefits booklet) should be requested.

## Available tools
${AVAILABLE_TOOLS_DESCRIPTION}

## Triage categories

The conversation summary will be prefixed with a triage category:

### CLINICAL (prefix "CLINICAL:")
The patient has a specific medical symptom or health complaint. The AI has already asked detailed clinical follow-up questions.
- **requestAttachmentUpload** — conditionally request document uploads:
  - **Health card** (\`id: "health_card"\`): Request when the recommendation may involve OHIP-covered services. Do NOT request if the user already has one on file.
  - **Benefits booklet** (\`id: "benefits_booklet"\`): Request when the issue might benefit from employer-covered services (physiotherapy, chiropractic, massage therapy, mental health counseling, EAP, etc.). Do NOT request if the user already has one on file.
  If both are needed, combine them into a single \`requestAttachmentUpload\` call with multiple attachment entries.

### NON-CLINICAL (prefix "NON-CLINICAL:")
The patient has a non-clinical concern (benefits, refills, finding a provider, administrative, etc.).
- **requestAttachmentUpload** — proactively request uploads for documents NOT already on file that would help with the patient's concern:
  - **Health card** (\`id: "health_card"\`, \`label: "Health card"\`, \`description: "Photo of your Ontario health card (front)"\`, \`multiple: false\`): Request if the patient doesn't already have one on file. A health card helps verify coverage eligibility.
  - **Benefits booklet** (\`id: "benefits_booklet"\`, \`label: "Benefits booklet"\`, \`description: "Your employer benefits booklet or summary of coverage (PDF)"\`, \`multiple: true\`): Request if the patient doesn't already have one on file. Benefits info helps recommend covered services.
  Include both in a single \`requestAttachmentUpload\` call if neither is on file.
- Only return an empty requiredInputs array if both documents are already on file or if the concern is purely administrative (e.g. booking logistics) where documents wouldn't help.

## Rules
1. **Output the exact tool names** as they appear above. Do not invent tool names.
2. Only request document uploads — do not request any symptom capture tools.

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

  logCachedUsage("evaluate-inputs", result.providerMetadata);

  const output = result.output ?? {
    requiredInputs: [],
    reasoning: "Fallback: no additional document uploads required",
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

  const existingDocuments = uniqueAttachments.map((a) => `${a.description} (${a.originalFilename})`);

  return { ...output, requiredInputs: validated, existingDocuments };
}
