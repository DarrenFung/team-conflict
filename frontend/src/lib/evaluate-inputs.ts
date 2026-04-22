import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";

const resultSchema = z.object({
  requiredInputs: z
    .array(
      z.object({
        tool: z.string(),
        args: z.record(z.string(), z.unknown()),
        reason: z.string(),
      }),
    )
    .describe("Ordered list of tools to invoke (always empty — uploads collected on Personalize page)."),
  reasoning: z.string(),
  existingDocuments: z
    .array(z.string())
    .describe("List of document descriptions already on file for this user"),
});

export type EvaluateInputsResult = z.infer<typeof resultSchema>;

type EvaluateInputsInput = {
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

  const existingDocuments = uniqueAttachments.map(
    (a) => `${a.description} (${a.originalFilename})`,
  );

  // Document uploads are collected on the Personalize page — never request them during chat.
  return {
    requiredInputs: [],
    reasoning: "Document uploads are collected on the Personalize page.",
    existingDocuments,
  };
}
