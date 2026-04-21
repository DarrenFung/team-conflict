"use server";

import {
  answerQuestion,
  backQuestion,
  startIntake as startIntakeLib,
  type IntakeOption,
  type IntakeState,
} from "@/lib/firsthx";

export async function startIntakeSession(userId: string): Promise<IntakeState> {
  return startIntakeLib(userId);
}

export type AnswerData =
  | { kind: "options"; options: Pick<IntakeOption, "id" | "displayText" | "originalText">[] }
  | { kind: "text"; text: string }
  | { kind: "number"; number: number; unit: string };

export async function submitAnswer(
  mkey: string,
  contentId: number,
  answer: AnswerData,
): Promise<IntakeState> {
  let data: Record<string, unknown>;

  switch (answer.kind) {
    case "options":
      data = { options: answer.options };
      break;
    case "text":
      data = { text: answer.text };
      break;
    case "number":
      data = { number: answer.number, unit: answer.unit };
      break;
  }

  return answerQuestion(mkey, contentId, data);
}

export async function goBack(mkey: string, questionNumber: number): Promise<IntakeState> {
  return backQuestion(mkey, questionNumber);
}
