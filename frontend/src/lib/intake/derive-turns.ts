import type { UIMessage } from "ai";

type MessagePart = UIMessage["parts"][number];

export type IntakeTurn = {
  question: string;
  rationale?: string;
  answer: string | null;
};

export function extractText(parts: MessagePart[], stripMarker = true): string {
  let text = parts
    .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
  if (stripMarker) text = text.replace("[COMPLETE]", "");
  return text.trim();
}

function partToolName(part: MessagePart): string | null {
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }
  return null;
}

/**
 * Walks messages (skipping the first user seed) and builds question/answer
 * pairs. Each non-empty assistant text block becomes a question; the following
 * user message becomes its answer.
 */
export function deriveTurns(messages: UIMessage[]): IntakeTurn[] {
  // messages[0] is the user seed (the initial reason entered in step 1).
  const rest = messages.slice(1);
  const turns: IntakeTurn[] = [];

  for (const msg of rest) {
    if (msg.role === "assistant") {
      // Skip messages that invoke modules — they are not user-facing questions.
      const hasToolCall = msg.parts.some((p) => partToolName(p) !== null);
      if (hasToolCall) continue;
      const text = extractText(msg.parts);
      if (text) {
        const [first, ...rest] = text.split(/\n\n+/);
        const rationale = rest.join("\n\n").trim() || undefined;
        turns.push({ question: first.trim(), rationale, answer: null });
      }
    } else if (msg.role === "user") {
      const text = extractText(msg.parts);
      const last = turns[turns.length - 1];
      if (last && last.answer === null) {
        last.answer = text;
      }
    }
  }

  return turns;
}
