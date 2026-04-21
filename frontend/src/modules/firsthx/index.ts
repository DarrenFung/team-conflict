import { z } from "zod";
import type { IntakeModule } from "../types";
import { FirstHxPanel } from "./FirstHxPanel";

export { FirstHxStandaloneScreen } from "./FirstHxStandaloneScreen";

const argsSchema = z.object({
  symptomHint: z
    .string()
    .describe("Short symptom name to characterize, e.g. 'chest pain' or 'headache'."),
});

const turnSchema = z.object({
  question: z.string(),
  display: z.string(),
});

const resultSchema = z.object({
  turns: z.array(turnSchema),
});

export type FirstHxArgs = z.infer<typeof argsSchema>;
export type FirstHxResult = z.infer<typeof resultSchema>;
export type FirstHxTurn = z.infer<typeof turnSchema>;

export const firstHxModule: IntakeModule<FirstHxArgs, FirstHxResult> = {
  name: "firsthxSymptomCapture",
  description:
    "Capture structured symptom detail (onset, duration, character, severity, associated findings) via the firstHx validated question set. Use when the patient has identified a specific symptom worth characterizing rigorously. Do not call more than once for the same symptom.",
  argsSchema,
  resultSchema,
  Component: FirstHxPanel,
  formatResultForLLM: ({ turns }) => {
    if (turns.length === 0) return "(no structured data captured)";
    return (
      "Structured symptom intake complete:\n" +
      turns.map((t) => `- ${t.question}: ${t.display}`).join("\n")
    );
  },
};
