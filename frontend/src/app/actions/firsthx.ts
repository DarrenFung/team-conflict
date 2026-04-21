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

export async function submitAnswer(
  mkey: string,
  contentId: number,
  options: Pick<IntakeOption, "id" | "displayText" | "originalText">[],
): Promise<IntakeState> {
  return answerQuestion(mkey, contentId, options);
}

export async function goBack(mkey: string): Promise<IntakeState> {
  return backQuestion(mkey);
}
