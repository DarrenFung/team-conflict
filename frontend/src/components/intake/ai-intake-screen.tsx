"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findModule } from "@/modules/registry";
import { PostIntakeAccountPrompt } from "@/components/intake/post-intake-account-prompt";
import { createEncounter } from "@/app/actions/encounter";

const COMPLETION_MARKER = "[INTAKE_COMPLETE]";

type Props = {
  greetingName: string;
};

type Step = "reason" | "chat";

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
      <svg
        width="9"
        height="9"
        viewBox="0 0 10 10"
        className="shrink-0 text-primary/70"
        aria-hidden
      >
        <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path
          d="M5 2.5v2.8L6.8 6.5"
          stroke="currentColor"
          strokeWidth="1.1"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      AI Intake
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

function ReasonScreen({ onContinue }: { onContinue: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = reason.trim();

  return (
    <div className="relative flex min-h-svh flex-col bg-white">
      <NavaraTopNav />
      <NavaraBackgroundGlow />

      <main className="relative z-10 flex flex-1 flex-col px-4 pt-[60px] pb-8 sm:px-6">
        <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col items-center text-center">
          <p className="font-[family-name:var(--font-dm-serif)] text-[52px] leading-none tracking-[-2px] text-foreground">
            Nav<span className="text-primary">ara</span>
          </p>
          <p className="mt-2 text-[15px] font-light tracking-[0.01em] text-muted-foreground">
            Navigate care with confidence
          </p>
        </div>

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

type MessagePart = UIMessage["parts"][number];

function partToolName(part: MessagePart): string | null {
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }
  return null;
}

type PendingToolCall = {
  toolName: string;
  toolCallId: string;
  input: unknown;
};

function findPendingToolCall(messages: UIMessage[]): PendingToolCall | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      const toolName = partToolName(part);
      if (!toolName) continue;
      const p = part as unknown as {
        state?: string;
        toolCallId?: string;
        input?: unknown;
      };
      if (p.state === "input-available" && p.toolCallId) {
        return { toolName, toolCallId: p.toolCallId, input: p.input };
      }
    }
  }
  return null;
}

function messageDisplayText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
    .map((p) => p.text ?? "")
    .join("")
    .replace(COMPLETION_MARKER, "")
    .trim();
}

function ChatHistory({
  messages,
  isStreaming,
}: {
  messages: UIMessage[];
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
        const text = messageDisplayText(m);
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

function ChatScreen({
  greetingName,
  initialReason,
}: {
  greetingName: string;
  initialReason: string;
}) {
  const [input, setInput] = useState("");
  const [encounterError, setEncounterError] = useState<Error | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const seededRef = useRef(false);

  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ encounterId }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Record encounter, then seed chat so every /api/chat request includes encounterId.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    createEncounter()
      .then(({ id }) => {
        setEncounterId(id);
        sendMessage({ text: initialReason });
      })
      .catch((err) => {
        console.error("Failed to create encounter", err);
        setEncounterError(err instanceof Error ? err : new Error(String(err)));
      });
  }, [initialReason, sendMessage]);

  const pending = useMemo(() => findPendingToolCall(messages), [messages]);
  const isComplete = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant || status !== "ready") return false;
    const raw = lastAssistant.parts
      .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
      .map((p) => p.text ?? "")
      .join("");
    return raw.includes(COMPLETION_MARKER);
  }, [messages, status]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || status !== "ready" || pending || isComplete) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  const isStreaming = status === "submitted" || status === "streaming";
  const activeModule = pending ? findModule(pending.toolName) : undefined;

  return (
    <div className="relative min-h-svh bg-white">
      <NavaraTopNav />
      <NavaraBackgroundGlow />

      <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-[620px] flex-col px-6 pb-12 pt-[76px] sm:px-8">
        <Header greetingName={greetingName} />

        {error || encounterError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{(error ?? encounterError)?.message || "Something went wrong."}</p>
            </div>
          </div>
        ) : (
          <div className="intake-glass flex flex-grow flex-col gap-4 rounded-2xl p-6 sm:p-8">
            <ChatHistory messages={messages} isStreaming={isStreaming} />

            {isComplete ? (
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
            ) : pending && activeModule ? (
              <activeModule.Component
                args={pending.input}
                onComplete={(result) => {
                  addToolOutput({
                    tool: pending.toolName,
                    toolCallId: pending.toolCallId,
                    output: activeModule.formatResultForLLM(result),
                  });
                }}
              />
            ) : pending ? (
              <div className="flex items-start gap-2 border-t border-[rgba(24,95,165,0.12)] pt-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>
                  AI called an unknown tool ({pending.toolName}). Check the module registry.
                </p>
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

export function AiIntakeScreen({ greetingName }: Props) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState("");

  if (step === "reason") {
    return (
      <ReasonScreen
        onContinue={(r) => {
          setReason(r);
          setStep("chat");
        }}
      />
    );
  }

  return <ChatScreen greetingName={greetingName} initialReason={reason} />;
}
