"use client";

import { useMemo, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const intakeQuestions = [
  "What challenge are you currently experiencing with your team?",
  "How has this conflict impacted your day-to-day work?",
  "What outcome would feel like a successful resolution for you?",
];

const firstHxBaseUrl = process.env.NEXT_PUBLIC_FIRSTHX_API_BASE_URL;
const firstHxApiKey = process.env.NEXT_PUBLIC_FIRSTHX_API_KEY;
const firstHxChatPath = process.env.NEXT_PUBLIC_FIRSTHX_CHAT_PATH ?? "/chat";

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function sendFirstHxChatMessage(message: string): Promise<string | null> {
  if (!firstHxBaseUrl) return null;

  const endpoint = buildUrl(firstHxBaseUrl, firstHxChatPath);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(firstHxApiKey ? { Authorization: `Bearer ${firstHxApiKey}` } : {}),
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error("FirstHx request failed.");
  }

  const payload = (await response.json()) as { reply?: string; message?: string };
  return payload.reply ?? payload.message ?? null;
}

export function FirstHxIntakeScreen({ greetingName }: { greetingName: string }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [assessmentAnswer, setAssessmentAnswer] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content:
        "Hi! I am your FirstHx intake assistant. Share context about your team conflict, and I will guide the next questions.",
    },
  ]);

  const progress = useMemo(
    () => ((questionIndex + 1) / intakeQuestions.length) * 100,
    [questionIndex],
  );

  async function handleSend() {
    const nextMessage = chatInput.trim();
    if (!nextMessage || isSending) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: nextMessage },
    ]);
    setChatInput("");
    setIsSending(true);

    try {
      const firstHxReply = await sendFirstHxChatMessage(nextMessage);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            firstHxReply ??
            "Thanks, I captured that. Connect FirstHx env settings to get live responses from the API.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I could not reach FirstHx right now. Please verify your API endpoint or key and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[1200px] flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <section className="glass-panel flex items-center justify-between gap-4 rounded-2xl p-4 md:p-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">
            Intake Assessment Workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {greetingName}. Complete assessment details and continue the FirstHx chat.
          </p>
        </div>
      </section>

      <section className="grid flex-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card className="glass-panel border-white/35 shadow-none">
          <CardHeader>
            <CardTitle>Intake Assessment</CardTitle>
            <CardDescription>Desktop-first layout with mobile responsive stacking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Question {questionIndex + 1} of {intakeQuestions.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/35 bg-white/40 p-4 backdrop-blur-sm dark:bg-black/20">
              <p className="text-sm font-medium text-foreground">{intakeQuestions[questionIndex]}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="assessment-answer" className="text-sm font-medium text-foreground">
                Your response
              </label>
              <Textarea
                id="assessment-answer"
                value={assessmentAnswer}
                onChange={(event) => setAssessmentAnswer(event.target.value)}
                placeholder="Write your answer for the current intake question..."
                className="min-h-32 border-white/45 bg-white/55 dark:bg-black/20"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuestionIndex((current) => Math.max(0, current - 1))}
                disabled={questionIndex === 0}
                className="border-primary/35 bg-white/55 text-foreground hover:bg-primary/10 active:bg-primary/20"
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setQuestionIndex((current) => Math.min(intakeQuestions.length - 1, current + 1))
                }
                disabled={questionIndex >= intakeQuestions.length - 1}
                className="bg-primary text-primary-foreground hover:bg-primary/85 active:scale-[0.99] active:bg-primary/75"
              >
                Next Question
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/35 shadow-none">
          <CardHeader>
            <CardTitle>FirstHx Chat</CardTitle>
            <CardDescription>ShadCN-inspired chatbot panel with subtle glass styling.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-[520px] flex-col gap-3">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-white/30 bg-white/35 p-3 backdrop-blur-sm dark:bg-black/15">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    message.role === "assistant"
                      ? "mr-auto border border-primary/20 bg-white/65 text-foreground dark:bg-black/20"
                      : "ml-auto bg-primary text-primary-foreground",
                  )}
                >
                  {message.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Message the intake assistant..."
                className="border-white/45 bg-white/60 dark:bg-black/15"
              />
              <Button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || chatInput.trim().length === 0}
                className="bg-primary px-3 text-primary-foreground hover:bg-primary/85 active:scale-[0.98] active:bg-primary/75"
              >
                <SendHorizontal className="size-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
