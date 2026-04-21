"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findModule } from "@/modules/registry";
import { createEncounter } from "@/app/actions/encounter";

const COMPLETION_MARKER = "[INTAKE_COMPLETE]";

type Props = {
  greetingName: string;
};

type Step = "reason" | "chat";

function FirstHxBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-black/5 px-2.5 py-1 text-[11px] font-medium tracking-wide text-foreground/50">
      <svg width="9" height="9" viewBox="0 0 10 10" className="shrink-0" aria-hidden>
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

type MessagePart = UIMessage["parts"][number];

function partToolName(part: MessagePart): string | null {
  // AI SDK v5+ encodes tool calls as parts with type `tool-<toolName>`.
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
      // Parts have a state machine; `input-available` means tool was called,
      // result hasn't been delivered yet.
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

function ChatScreen({
  greetingName,
  initialReason,
}: {
  greetingName: string;
  initialReason: string;
}) {
  const [input, setInput] = useState("");
  const [encounterError, setEncounterError] = useState<Error | null>(null);
  const encounterIdRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Resolved fresh on every request — including auto-resumes after tool
      // calls — so the encounterId always rides along once set.
      body: () => ({ encounterId: encounterIdRef.current }),
    }),
    // Auto-submit once all tool calls on the last assistant message have
    // outputs, so Gemini resumes immediately with the tool results in context.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Record a new Encounter for this intake session, then seed with the
  // reason-for-visit as the first user message. Seeding waits on the encounter
  // so every /api/chat call has a valid encounterId.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    createEncounter()
      .then(({ id }) => {
        encounterIdRef.current = id;
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
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:py-12">
      <Header greetingName={greetingName} />

      {error || encounterError ? (
        <div className="intake-glass flex items-start gap-3 rounded-2xl p-5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{(error ?? encounterError)?.message || "Something went wrong."}</p>
        </div>
      ) : (
        <div className="intake-glass flex flex-grow flex-col gap-4 rounded-2xl p-6 sm:p-8">
          <ChatHistory messages={messages} isStreaming={isStreaming} />

          {isComplete ? (
            <div className="flex flex-col items-center gap-2 border-t border-white/40 pt-4">
              <CheckCircle2 className="size-8 text-primary" />
              <p className="text-sm font-semibold text-foreground">Assessment complete</p>
              <p className="text-xs text-muted-foreground">
                Your intake summary has been recorded above.
              </p>
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
            <div className="flex items-start gap-2 border-t border-white/40 pt-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>
                AI called an unknown tool ({pending.toolName}). Check the module registry.
              </p>
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

export function AiIntakeScreen({ greetingName }: Props) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState("");

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

  return <ChatScreen greetingName={greetingName} initialReason={reason} />;
}
