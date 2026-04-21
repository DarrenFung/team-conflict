import type { UIMessage } from "ai";

export type IntakeData = {
  patientName: string;
  encounterDate: string;
  chiefComplaint: string;
  clinicianSummary: string | null;
  recommendation: string | null;
  firstHxSymptoms: { question: string; display: string }[] | null;
  uploadedFiles: { specId: string; filenames: string[] }[] | null;
};

type MessagePart = UIMessage["parts"][number];

function partToolName(part: MessagePart): string | null {
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }
  return null;
}

type ToolPart = {
  type: string;
  state?: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
};

/**
 * Extract structured intake data from the chat messages and module results.
 *
 * `moduleResults` is the raw typed result map keyed by toolCallId that
 * ChatScreen keeps in state. It gives us direct access to firstHx turns and
 * attachment data without parsing LLM-formatted text.
 */
export function extractIntakeData(
  messages: UIMessage[],
  greetingName: string,
  moduleResults: Record<string, unknown>,
): IntakeData {
  const encounterDate = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 1. Chief complaint — first user message
  const firstUserMsg = messages.find((m) => m.role === "user");
  const chiefComplaint =
    firstUserMsg?.parts
      .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
      .map((p) => p.text ?? "")
      .join("")
      .trim() || "Not recorded";

  // 2. Walk messages to find tool parts
  let clinicianSummary: string | null = null;
  let recommendation: string | null = null;
  let firstHxSymptoms: { question: string; display: string }[] | null = null;
  let uploadedFiles: { specId: string; filenames: string[] }[] | null = null;

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;

    for (const part of msg.parts) {
      const toolName = partToolName(part);
      if (!toolName) continue;
      const p = part as unknown as ToolPart;
      if (p.state !== "output-available") continue;

      if (toolName === "firsthxSymptomCapture") {
        // Prefer moduleResults for typed data
        const raw = p.toolCallId ? moduleResults[p.toolCallId] : undefined;
        if (raw && typeof raw === "object" && "turns" in raw) {
          const typed = raw as { turns: { question: string; display: string }[] };
          if (typed.turns.length > 0) {
            firstHxSymptoms = typed.turns;
          }
        }
      }

      if (toolName === "requestAttachmentUpload") {
        const raw = p.toolCallId ? moduleResults[p.toolCallId] : undefined;
        if (raw && typeof raw === "object" && "uploads" in raw) {
          const typed = raw as {
            uploads: {
              specId: string;
              files: { originalFilename: string }[];
            }[];
          };
          const mapped = typed.uploads
            .filter((u) => u.files.length > 0)
            .map((u) => ({
              specId: u.specId,
              filenames: u.files.map((f) => f.originalFilename),
            }));
          if (mapped.length > 0) uploadedFiles = mapped;
        }
      }

      if (toolName === "generate_recommendation") {
        // The recommendation is the tool's output string
        if (typeof p.output === "string") {
          recommendation = p.output;
        }

        // The clinician summary is the text content in the same assistant
        // message, written just before the tool call.
        const textParts = msg.parts
          .filter(
            (pt): pt is Extract<MessagePart, { type: "text" }> =>
              pt.type === "text",
          )
          .map((pt) => pt.text ?? "")
          .join("")
          .replace("[COMPLETE]", "")
          .trim();
        if (textParts) clinicianSummary = textParts;
      }
    }
  }

  // If clinician summary ended up in a different message (the final one with
  // [COMPLETE] and the patient-facing recommendation presentation), try to
  // separate it. The summary follows a structured format with headers like
  // "Chief complaint", "HPI", etc. — look for that in the last assistant
  // messages if we didn't find it above.
  if (!clinicianSummary) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== "assistant") continue;
      const text = msg.parts
        .filter(
          (p): p is Extract<MessagePart, { type: "text" }> =>
            p.type === "text",
        )
        .map((p) => p.text ?? "")
        .join("")
        .replace("[COMPLETE]", "")
        .trim();
      if (text && text.length > 100) {
        clinicianSummary = text;
        break;
      }
    }
  }

  return {
    patientName: greetingName,
    encounterDate,
    chiefComplaint,
    clinicianSummary,
    recommendation,
    firstHxSymptoms,
    uploadedFiles,
  };
}
