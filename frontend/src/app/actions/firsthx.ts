"use server";

import { answerQuestion, backQuestion, type IntakeOption, type IntakeState } from "@/lib/firsthx";

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
