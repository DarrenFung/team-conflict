"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, CheckCircle2, ChevronLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  goBack as goBackAction,
  startIntakeSession,
  submitAnswer,
} from "@/app/actions/firsthx";
import type { IntakeContent, IntakeOption, IntakeState } from "@/lib/firsthx";

const START_FIRSTHX_PATTERN = /\[START_FIRSTHX:([^\]]+)\]/;
const FIRSTHX_RESULT_PREFIX = "[FIRSTHX_RESULT]";
const COMPLETION_MARKER = "[INTAKE_COMPLETE]";

type Props = {
  greetingName: string;
};

type Step = "reason" | "chat";
type Mode = "chat" | "firsthx" | "complete";

type FirstHxTurn = {
  question: string;
  answers: string[];
};

function buildSelectedOptions(
  content: IntakeContent,
  selectedIds: number[],
): Pick<IntakeOption, "id" | "displayText" | "originalText">[] {
  return (content.options ?? [])
    .filter((opt) => selectedIds.includes(opt.id))
    .map(({ id, displayText, originalText }) => ({ id, displayText, originalText }));
}

function messageText(message: { parts: Array<{ type: string; text?: string }> }) {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

function cleanAssistantText(raw: string) {
  return raw
    .replace(START_FIRSTHX_PATTERN, "")
    .replace(COMPLETION_MARKER, "")
    .trim();
}

function cleanUserText(raw: string) {
  if (!raw.startsWith(FIRSTHX_RESULT_PREFIX)) return raw;
  return "(Structured symptom intake completed)";
}

function FirstHxBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-black/5 px-2.5 py-1 text-[11px] font-medium text-foreground/50 tracking-wide">
      <svg width="9" height="9" viewBox="0 0 10 10" className="shrink-0" aria-hidden>
        <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M5 2.5v2.8L6.8 6.5" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </svg>
      AI + firstHx
    </span>
  );
}

function Header({ greetingName }: { greetingName: string }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
          Intake Assessment
        </p>
        <h1 className="mt-0.5 text-lg font-semibold text-foreground">Hi {greetingName}</h1>
      </div>
      <FirstHxBadge />
    </header>
  );
}

function ReasonScreen({
  greetingName,
  onContinue,
}: {
  greetingName: string;
  onContinue: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = reason.trim();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:py-12">
      <Header greetingName={greetingName} />
      <div className="intake-glass flex flex-grow flex-col gap-5 rounded-2xl p-6 sm:p-8">
        <div>
          <h2 className="text-[22px] font-semibold leading-snug tracking-tight text-foreground">
            What&apos;s going on today?
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            A few words is plenty — we&apos;ll ask follow-up questions from there.
          </p>
        </div>
        <div
          className="relative flex-grow cursor-text rounded-xl border border-white/60 bg-white/30 p-4 transition-colors focus-within:border-primary/40 focus-within:bg-white/50"
          onClick={() => textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && trimmed) {
                e.preventDefault();
                onContinue(trimmed);
              }
            }}
            placeholder="Describe what you're experiencing… (Enter to continue, Shift+Enter for newline)"
            className="h-full min-h-[140px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-foreground placeholder:text-foreground/35 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-end pt-1">
          <Button type="button" size="lg" disabled={!trimmed} onClick={() => onContinue(trimmed)}>
            Continue
          </Button>
        </div>
      </div>
    </main>
  );
}

function ChatHistory({
  messages,
  isStreaming,
}: {
  messages: ReturnType<typeof useChat>["messages"];
  isStreaming: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div
      ref={scrollRef}
      className="flex max-h-[45vh] flex-col gap-3 overflow-y-auto pr-1"
    >
      {messages.map((m) => {
        const raw = messageText(m);
        const text =
          m.role === "assistant" ? cleanAssistantText(raw) : cleanUserText(raw);
        if (!text) return null;
        return (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto border border-white/60 bg-white/60 text-foreground",
            )}
          >
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        );
      })}
      {isStreaming && (
        <div className="mr-auto rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-sm text-muted-foreground">
          Thinking…
        </div>
      )}
    </div>
  );
}

function FirstHxPanel({
  state,
  isPending,
  error,
  onAnswer,
  onBack,
}: {
  state: IntakeState;
  isPending: boolean;
  error: string | null;
  onAnswer: (selectedIds: number[]) => void;
  onBack: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const content = state.content;

  useEffect(() => {
    setSelectedIds([]);
  }, [content?.id]);

  if (!content) {
    return (
      <div className="border-t border-white/40 px-1 pt-4 text-sm text-muted-foreground">
        Loading structured questions…
      </div>
    );
  }

  const options = content.options ?? [];
  const isMulti = content.type === "multiSelect";
  const canSubmit = selectedIds.length > 0 || !content.inputRequired;

  function toggle(optionId: number, deselectOthers?: boolean) {
    if (isMulti && !deselectOthers) {
      setSelectedIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelectedIds([optionId]);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-white/40 pt-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">
          firstHx structured capture
        </p>
        <h3 className="mt-1 text-[16px] font-semibold leading-snug text-foreground">
          {content.title}
        </h3>
        {content.helperText && (
          <p className="mt-1 text-sm text-muted-foreground">{content.helperText}</p>
        )}
        {isMulti && (
          <p className="mt-1 text-xs text-muted-foreground/70">Select all that apply</p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id, option.deselectOtherAnswers)}
              disabled={isPending}
              className={cn("intake-option", isSelected && "intake-option-selected")}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected ? "border-primary bg-primary" : "border-foreground/25 bg-transparent",
                  )}
                >
                  {isSelected && (
                    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                      <path
                        d="M1 4l2.2 2.2L7 1.5"
                        stroke="#fff"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                {option.displayText}
              </span>
              {option.helperText && (
                <span className="mt-1 block pl-7 text-xs text-muted-foreground">
                  {option.helperText}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-1">
        {content.backAllowed && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={isPending}
          >
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          onClick={() => onAnswer(selectedIds)}
          disabled={isPending || !canSubmit}
          className="ml-auto"
        >
          {isPending ? "Loading…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function ChatScreen({
  greetingName,
  initialReason,
  userId,
}: {
  greetingName: string;
  initialReason: string;
  userId: string;
}) {
  const [input, setInput] = useState("");
  const seededRef = useRef(false);
  const launchingRef = useRef(false);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [mode, setMode] = useState<Mode>("chat");
  const [firstHxState, setFirstHxState] = useState<IntakeState | null>(null);
  const [firstHxHistory, setFirstHxHistory] = useState<FirstHxTurn[]>([]);
  const [firstHxError, setFirstHxError] = useState<string | null>(null);
  const [firstHxPending, startFirstHxTransition] = useTransition();

  // Seed first user message once
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    sendMessage({ text: initialReason });
  }, [initialReason, sendMessage]);

  // Detect markers in the latest assistant message
  useEffect(() => {
    if (status !== "ready" || mode !== "chat") return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    const text = messageText(lastAssistant);

    if (text.includes(COMPLETION_MARKER)) {
      setMode("complete");
      return;
    }

    const match = text.match(START_FIRSTHX_PATTERN);
    if (match && !launchingRef.current && !firstHxState) {
      launchingRef.current = true;
      setFirstHxError(null);
      setFirstHxHistory([]);
      setMode("firsthx");
      startIntakeSession(userId)
        .then((state) => {
          setFirstHxState(state);
        })
        .catch((err) => {
          setFirstHxError(err instanceof Error ? err.message : "Failed to start firstHx");
          setMode("chat");
        })
        .finally(() => {
          launchingRef.current = false;
        });
    }
  }, [messages, status, mode, firstHxState, userId]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || status !== "ready" || mode !== "chat") return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function handleFirstHxAnswer(selectedIds: number[]) {
    if (!firstHxState?.content) return;
    const content = firstHxState.content;
    const selectedOptions = buildSelectedOptions(content, selectedIds);

    startFirstHxTransition(async () => {
      try {
        setFirstHxError(null);
        const next = await submitAnswer(firstHxState.mkey, content.id, {
          kind: "options",
          options: selectedOptions,
        });
        setFirstHxHistory((prev) => [
          ...prev,
          {
            question: content.title,
            answers: selectedOptions.map((o) => o.displayText),
          },
        ]);

        if (next.intakeStatus === "completed") {
          const summary = formatFirstHxSummary([
            ...firstHxHistory,
            { question: content.title, answers: selectedOptions.map((o) => o.displayText) },
          ]);
          setFirstHxState(null);
          setFirstHxHistory([]);
          setMode("chat");
          sendMessage({ text: `${FIRSTHX_RESULT_PREFIX}\n${summary}` });
        } else {
          setFirstHxState(next);
        }
      } catch (err) {
        setFirstHxError(err instanceof Error ? err.message : "Failed to submit answer");
      }
    });
  }

  function handleFirstHxBack() {
    if (!firstHxState?.content) return;
    const contentId = firstHxState.content.id;
    startFirstHxTransition(async () => {
      try {
        setFirstHxError(null);
        const prev = await goBackAction(firstHxState.mkey, contentId);
        setFirstHxState(prev);
        setFirstHxHistory((h) => h.slice(0, -1));
      } catch (err) {
        setFirstHxError(err instanceof Error ? err.message : "Failed to go back");
      }
    });
  }

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:py-12">
      <Header greetingName={greetingName} />

      {error ? (
        <div className="intake-glass flex items-start gap-3 rounded-2xl p-5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error.message || "Something went wrong."}</p>
        </div>
      ) : (
        <div className="intake-glass flex flex-grow flex-col gap-4 rounded-2xl p-6 sm:p-8">
          <ChatHistory messages={messages} isStreaming={isStreaming} />

          {mode === "complete" ? (
            <div className="flex flex-col items-center gap-2 border-t border-white/40 pt-4">
              <CheckCircle2 className="size-8 text-primary" />
              <p className="text-sm font-semibold text-foreground">Assessment complete</p>
              <p className="text-xs text-muted-foreground">
                Your intake summary has been recorded above.
              </p>
            </div>
          ) : mode === "firsthx" && firstHxState ? (
            <FirstHxPanel
              state={firstHxState}
              isPending={firstHxPending}
              error={firstHxError}
              onAnswer={handleFirstHxAnswer}
              onBack={handleFirstHxBack}
            />
          ) : mode === "firsthx" ? (
            <div className="border-t border-white/40 pt-4 text-sm text-muted-foreground">
              Starting structured symptom capture…
            </div>
          ) : (
            <div className="flex items-end gap-2 border-t border-white/40 pt-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your answer…"
                rows={1}
                disabled={status !== "ready"}
                className="flex-grow resize-none rounded-xl border border-white/60 bg-white/50 px-4 py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-foreground/35 focus:border-primary/40 focus:bg-white/70 focus:outline-none disabled:opacity-60"
              />
              <Button
                type="button"
                size="lg"
                onClick={handleSend}
                disabled={!input.trim() || status !== "ready"}
              >
                <Send className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function formatFirstHxSummary(history: FirstHxTurn[]): string {
  if (history.length === 0) return "(no structured data captured)";
  return history
    .map((turn) => `- ${turn.question}: ${turn.answers.join(", ") || "(no answer)"}`)
    .join("\n");
}

export function AiIntakeScreen({ greetingName }: Props) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState("");
  const [userId] = useState(() => crypto.randomUUID());

  if (step === "reason") {
    return (
      <ReasonScreen
        greetingName={greetingName}
        onContinue={(r) => {
          setReason(r);
          setStep("chat");
        }}
      />
    );
  }

  return <ChatScreen greetingName={greetingName} initialReason={reason} userId={userId} />;
}
