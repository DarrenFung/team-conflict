"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, CheckCircle2, ChevronLeft, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  goBack as goBackAction,
  startIntakeSession,
  submitAnswer,
  type AnswerData,
} from "@/app/actions/firsthx";
import type { IntakeContent, IntakeOption, IntakeState } from "@/lib/firsthx";
import { PostIntakeAccountPrompt } from "@/components/intake/post-intake-account-prompt";

function isMultiSelectType(type: string) {
  return type === "selectAll" || type === "selectAllBodyParts";
}

function isFreeTextType(type: string) {
  return type === "freeTextForm" || type === "freeTextRfv";
}

function isNumberType(type: string) {
  return type === "numberForm" || type === "numberFormSlider";
}

function isInfoType(type: string) {
  return type === "text";
}

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
  display: string;
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

/** Fixed top nav — logo + auth actions, matches page.tsx header */
function NavaraTopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-[rgba(24,95,165,0.12)] bg-white/90 px-6 backdrop-blur-[10px] sm:px-8">
      <Link
        href="/"
        className="font-[family-name:var(--font-dm-serif)] text-[20px] tracking-tight text-foreground"
      >
        Nav<span className="text-primary">ara</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-primary/25 text-primary text-[13px] hover:border-primary hover:bg-secondary",
          )}
        >
          Log in
        </Link>
        <Link
          href="/sign-up"
          className={cn(
            buttonVariants({ size: "sm" }),
            "text-[13px] font-medium shadow-[0_2px_10px_rgba(24,95,165,0.2)] hover:bg-primary/90",
          )}
        >
          Sign up
        </Link>
      </div>
    </header>
  );
}

/** Subtle radial glow — same as main::before in navara-landing-v2.html */
function NavaraBackgroundGlow() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(24,95,165,0.05) 0%, transparent 70%)",
      }}
    />
  );
}

function FirstHxBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(24,95,165,0.12)] bg-[#F7F9FC] px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground">
      <svg width="9" height="9" viewBox="0 0 10 10" className="shrink-0 text-primary/70" aria-hidden>
        <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M5 2.5v2.8L6.8 6.5" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </svg>
      AI + firstHx
    </span>
  );
}

function Header({ greetingName }: { greetingName: string }) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
          Intake Assessment
        </p>
        <h1 className="mt-1 text-lg font-semibold text-foreground">Hi {greetingName}</h1>
      </div>
      <FirstHxBadge />
    </header>
  );
}

const REASON_PROMPTS = [
  "I've had knee pain for 3 weeks and don't know if I need physio or a specialist",
  "I'm feeling anxious and overwhelmed and don't know where to get help",
  "I need a family doctor and don't know how to find one covered by my plan",
];

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
    <div className="relative flex min-h-svh flex-col bg-white">
      <NavaraTopNav />
      <NavaraBackgroundGlow />

      {/* Full-height content column below fixed nav */}
      <main className="relative z-10 flex flex-1 flex-col px-4 pt-[60px] pb-8 sm:px-6">
        {/* Logo + tagline — centered, compact */}
        <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col items-center text-center">
          <p className="font-[family-name:var(--font-dm-serif)] text-[52px] leading-none tracking-[-2px] text-foreground">
            Nav<span className="text-primary">ara</span>
          </p>
          <p className="mt-2 text-[15px] font-light tracking-[0.01em] text-muted-foreground">
            Navigate care with confidence
          </p>
        </div>

        {/* Composer — compact card (~pic2): short input + action bar */}
        <div className="mx-auto mt-8 flex w-full max-w-3xl flex-1 flex-col">
          <div
            className={cn(
              "flex h-[180px] cursor-text flex-col overflow-hidden rounded-[14px] border-[1.5px] border-[rgba(24,95,165,0.2)] bg-white shadow-[0_2px_16px_rgba(24,95,165,0.06)] transition-[border-color,box-shadow] duration-200",
              "focus-within:border-primary focus-within:shadow-[0_4px_24px_rgba(24,95,165,0.12)]",
            )}
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
              placeholder="Describe what's going on — e.g."
              className="min-h-0 flex-1 resize-none bg-transparent px-4 pt-3 pb-2 text-[15px] leading-relaxed text-foreground placeholder:text-[#A0AEC0] focus:outline-none sm:px-5 sm:pt-[14px]"
            />

            {/* Toolbar — divider + left pill + right send */}
            <div className="flex shrink-0 items-center justify-between border-t border-[rgba(24,95,165,0.12)] px-3 py-2.5">
              <button
                type="button"
                aria-disabled
                className="flex items-center gap-1.5 rounded-lg border border-[rgba(24,95,165,0.12)] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[rgba(24,95,165,0.25)] hover:bg-[#E6F1FB] hover:text-primary"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M1 11l4-4 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                Photo / Video / File
              </button>

              <button
                type="button"
                disabled={!trimmed}
                onClick={(e) => {
                  e.stopPropagation();
                  if (trimmed) onContinue(trimmed);
                }}
                className="flex size-10 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(24,95,165,0.25)] transition-transform hover:bg-[#0e4a87] active:scale-[1.04] disabled:pointer-events-none disabled:opacity-40"
                aria-label="Continue"
              >
                <Send className="size-[18px]" />
              </button>
            </div>
          </div>

          {/* Example prompts — full-width, stacked vertically */}
          <div className="mt-4 flex flex-col gap-2.5">
            {REASON_PROMPTS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setReason(chip);
                  textareaRef.current?.focus();
                }}
                className="w-full rounded-[20px] border border-[rgba(24,95,165,0.12)] bg-[#F7F9FC] px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-[rgba(24,95,165,0.25)] hover:bg-[#E6F1FB] hover:text-primary"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
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
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(24,95,165,0.2)]"
                : "mr-auto border border-[rgba(24,95,165,0.15)] bg-white text-foreground",
            )}
          >
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        );
      })}
      {isStreaming && (
        <div className="mr-auto rounded-2xl border border-[rgba(24,95,165,0.12)] bg-[#F7F9FC] px-4 py-2.5 text-sm text-muted-foreground">
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
  onAnswer: (answer: AnswerData, display: string) => void;
  onBack: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const content = state.content;
  const contentId = content?.id;

  useEffect(() => {
    setSelectedIds([]);
    setTextValue("");
    setNumberValue("");
    setSelectedUnit("");
  }, [contentId]);

  useEffect(() => {
    if (content && isNumberType(content.type) && !selectedUnit && content.units?.[0]) {
      setSelectedUnit(content.units[0]);
    }
  }, [content, selectedUnit]);

  if (!content) {
    return (
      <div className="border-t border-[rgba(24,95,165,0.12)] px-1 pt-4 text-sm text-muted-foreground">
        Loading structured questions…
      </div>
    );
  }

  const type = content.type;
  const options = content.options ?? [];
  const isMulti = isMultiSelectType(type);

  let canSubmit: boolean;
  if (isInfoType(type)) {
    canSubmit = true;
  } else if (isFreeTextType(type)) {
    canSubmit = !content.inputRequired || textValue.trim().length > 0;
  } else if (isNumberType(type)) {
    canSubmit = numberValue !== "" && !Number.isNaN(Number(numberValue));
  } else {
    canSubmit = selectedIds.length > 0 || !content.inputRequired;
  }

  function toggle(optionId: number, deselectOthers?: boolean) {
    if (isMulti && !deselectOthers) {
      setSelectedIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelectedIds([optionId]);
    }
  }

  function submit() {
    if (!canSubmit || !content) return;
    if (isInfoType(type)) {
      onAnswer({ kind: "options", options: [] }, "Continued");
      return;
    }
    if (isFreeTextType(type)) {
      const text = textValue.trim();
      onAnswer({ kind: "text", text }, text || "—");
      return;
    }
    if (isNumberType(type)) {
      const n = Number(numberValue);
      if (Number.isNaN(n)) return;
      const unit = selectedUnit;
      onAnswer(
        { kind: "number", number: n, unit },
        unit ? `${n} ${unit}` : String(n),
      );
      return;
    }
    const selected = buildSelectedOptions(content, selectedIds);
    const display = selected.map((o) => o.displayText).join(", ") || "—";
    onAnswer({ kind: "options", options: selected }, display);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-[rgba(24,95,165,0.12)] pt-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
          firstHx structured capture
        </p>
        {content.title && (
          <h3 className="mt-1 font-[family-name:var(--font-dm-serif)] text-[17px] font-normal leading-snug text-foreground">
            {content.title}
          </h3>
        )}
        {content.helperText && (
          <p className="mt-1 text-sm text-muted-foreground">{content.helperText}</p>
        )}
        {isMulti && (
          <p className="mt-1 text-xs text-muted-foreground/70">Select all that apply</p>
        )}
      </div>

      {content.html && (
        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isFreeTextType(type) ? (
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          disabled={isPending}
          placeholder={content.inputRequired ? "Type your answer…" : "Type your answer (optional)…"}
          className="min-h-[100px] w-full resize-none rounded-xl border border-white/60 bg-white/30 px-4 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-foreground/35 focus:border-primary/40 focus:bg-white/50 focus:outline-none"
        />
      ) : isNumberType(type) ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="number"
            value={numberValue}
            min={0}
            onChange={(e) => setNumberValue(e.target.value.replace(/-/g, ""))}
            disabled={isPending}
            placeholder="Enter a number"
            className="w-full rounded-xl border border-white/60 bg-white/30 px-4 py-3 text-[15px] text-foreground placeholder:text-foreground/35 focus:border-primary/40 focus:bg-white/50 focus:outline-none"
          />
          {content.units && content.units.length > 0 && (
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={isPending}
              className="rounded-xl border border-white/60 bg-white/30 px-4 py-3 text-[15px] text-foreground focus:border-primary/40 focus:bg-white/50 focus:outline-none sm:w-40"
            >
              {content.units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : options.length > 0 ? (
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
                      "flex size-4 shrink-0 items-center justify-center border transition-colors",
                      isMulti ? "rounded-sm" : "rounded-full",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-foreground/25 bg-transparent",
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
      ) : null}

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
          onClick={submit}
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

  function handleFirstHxAnswer(answer: AnswerData, display: string) {
    if (!firstHxState?.content) return;
    const content = firstHxState.content;

    startFirstHxTransition(async () => {
      try {
        setFirstHxError(null);
        const next = await submitAnswer(firstHxState.mkey, content.id, answer);
        const turn: FirstHxTurn = { question: content.title, display };
        setFirstHxHistory((prev) => [...prev, turn]);

        if (next.intakeStatus === "completed") {
          const summary = formatFirstHxSummary([...firstHxHistory, turn]);
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
    <div className="relative min-h-svh bg-white">
      <NavaraTopNav />
      <NavaraBackgroundGlow />

      <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-[620px] flex-col px-6 pb-12 pt-[76px] sm:px-8">
        <Header greetingName={greetingName} />

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{error.message || "Something went wrong."}</p>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-grow flex-col gap-4 rounded-2xl border-[1.5px] border-[rgba(24,95,165,0.15)] bg-white/80 p-6 shadow-[0_2px_16px_rgba(24,95,165,0.06)] backdrop-blur-sm sm:p-8",
            )}
          >
            <ChatHistory messages={messages} isStreaming={isStreaming} />

            {mode === "complete" ? (
              <div className="flex flex-col gap-4 border-t border-[rgba(24,95,165,0.12)] pt-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="size-9 text-primary drop-shadow-[0_2px_8px_rgba(24,95,165,0.2)]" />
                  <p className="font-[family-name:var(--font-dm-serif)] text-lg text-foreground">
                    Assessment complete
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your intake summary has been recorded above.
                  </p>
                </div>
                <PostIntakeAccountPrompt />
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
              <div className="border-t border-[rgba(24,95,165,0.12)] pt-4 text-sm text-muted-foreground">
                Starting structured symptom capture…
              </div>
            ) : (
              <div className="relative border-t border-[rgba(24,95,165,0.12)] pt-4">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-[14px] border-[1.5px] border-[rgba(24,95,165,0.2)] bg-white shadow-[0_2px_16px_rgba(24,95,165,0.06)] transition-[border-color,box-shadow] duration-200",
                    "focus-within:border-primary focus-within:shadow-[0_4px_24px_rgba(24,95,165,0.12)]",
                  )}
                >
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
                    disabled={status !== "ready"}
                    rows={3}
                    className="block min-h-[100px] max-h-[140px] w-full resize-none bg-transparent px-4 pb-14 pt-3 text-[15px] leading-relaxed text-foreground placeholder:text-[#A0AEC0] focus:outline-none disabled:opacity-60"
                  />
                  <div className="absolute bottom-2.5 right-2.5">
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim() || status !== "ready"}
                      className="flex size-10 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(24,95,165,0.25)] transition-transform hover:bg-[#0e4a87] active:scale-[1.04] disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Send"
                    >
                      <Send className="size-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function formatFirstHxSummary(history: FirstHxTurn[]): string {
  if (history.length === 0) return "(no structured data captured)";
  return history.map((turn) => `- ${turn.question}: ${turn.display}`).join("\n");
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
