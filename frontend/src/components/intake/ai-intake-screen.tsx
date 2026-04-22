"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { upload } from "@vercel/blob/client";
import { findModule } from "@/modules/registry";
import { createEncounter, isRecommendationReady } from "@/app/actions/encounter";
import { recordAttachment } from "@/app/actions/attachments";
import { AskLukeTopNav } from "@/components/layout/ask-luke-top-nav";
import { AskLukeWordmark } from "@/components/landing/ask-luke-wordmark";
import { TrendingPrompts } from "@/components/landing/trending-prompts";
import { LanguagePills } from "@/components/landing/language-pills";
import {
  IntakeJourneyBar,
  IntakeProgressBar,
  IntakeBottomNav,
  IntakeStage,
} from "@/components/intake/intake-journey-shell";
import { deriveTurns } from "@/lib/intake/derive-turns";
import {
  IntakeReviewSummary,
  IntakeReviewSummarySkeleton,
} from "@/components/intake/intake-review-summary";
import { PersonalizeScreen } from "@/components/intake/personalize-screen";
import { DownloadPdfButton } from "@/components/intake/download-pdf-button";
import { PostIntakeAccountPrompt } from "@/components/intake/post-intake-account-prompt";
import type { PatientReview } from "@/app/api/intake/patient-review/route";

const COMPLETION_MARKER = "[COMPLETE]";

/** Tools that execute server-side (have an `execute` handler in the API route).
 *  While in-flight these briefly appear as pending tool calls on the client —
 *  we show a processing indicator instead of an "unknown tool" error. */
const SERVER_SIDE_TOOLS = new Set([
  "generate_recommendation",
  "evaluate_input_requirements",
]);

/** Status phrases cycled in the pending-tool bubble. `generate_recommendation`
 *  can take 10-30s so the rotation gives the user a sense of progress; the
 *  order roughly mirrors the stages the recommend() pipeline runs through. */
const RECOMMENDATION_PHRASES = [
  "Interpreting symptoms…",
  "Reading reference materials…",
  "Checking coverage options…",
  "Looking up nearby providers…",
  "Assessing urgency…",
  "Structuring your recommendation…",
];

const EVALUATE_PHRASES = [
  "Reviewing your intake…",
  "Deciding what to ask next…",
];

function CyclingStatus({
  phrases,
  intervalMs = 2800,
}: {
  phrases: string[];
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (phrases.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [phrases.length, intervalMs]);
  return (
    <span
      key={idx}
      className="inline-block animate-in fade-in-0 duration-500"
    >
      {phrases[idx]}
    </span>
  );
}

type Props = {
  greetingName: string;
  initialReason?: string;
};

type Step = "reason" | "chat";

// ── Turn derivation ───────────────────────────────────────────────────────────

type MessagePart = UIMessage["parts"][number];

// ── Pending tool call helpers ─────────────────────────────────────────────────

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

// ── Shared question-stage components ─────────────────────────────────────────

function QNumber({ n, label = "Question" }: { n: number; label?: string }) {
  return (
    <p className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-primary opacity-80">
      {label} {n}
    </p>
  );
}

function QText({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-8 font-[family-name:var(--font-dm-serif)] text-[clamp(22px,3.8vw,32px)] leading-[1.3] tracking-[-0.4px] text-[#0E1420]">
      {children}
    </h2>
  );
}

/** Underline-style answer textarea matching the HTML mock */
function AnswerInput({
  value,
  onChange,
  onEnter,
  placeholder = "Type your answer here…",
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => ref.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  function autoResize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        autoResize();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter?.();
        }
      }}
      className={cn(
        "block w-full resize-none overflow-hidden border-0 border-b-2 border-[rgba(24,95,165,0.2)] bg-transparent pb-2.5 pt-2.5 font-light text-[18px] leading-relaxed text-foreground placeholder:text-[#C0C8D2] focus:border-primary focus:outline-none transition-colors duration-200",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    />
  );
}

/** The OK + optional Skip row */
function ActionRow({
  onOk,
  onSkip,
  okLabel = "OK",
  okDisabled,
  showSkip = false,
}: {
  onOk: () => void;
  onSkip?: () => void;
  okLabel?: ReactNode;
  okDisabled?: boolean;
  showSkip?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center gap-4">
      <button
        type="button"
        onClick={onOk}
        disabled={okDisabled}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-[15px] font-medium text-white shadow-[0_3px_14px_rgba(24,95,165,0.22)] transition-all hover:bg-[#0e4a87] hover:-translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
      >
        {okLabel}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {showSkip && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="bg-transparent border-none text-[13px] text-muted-foreground px-1 py-1 transition-colors hover:text-foreground"
        >
          Skip
        </button>
      )}
    </div>
  );
}

// ── Rationale balloon ─────────────────────────────────────────────────────────

function RationaleBalloon({ text }: { text: string }) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mb-6 text-sm leading-relaxed text-muted-foreground">
      {text}
    </div>
  );
}

// ── Upload row ────────────────────────────────────────────────────────────────

function fmt(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

type UploadRowProps = {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
};

function UploadRow({ files, onAdd, onRemove, disabled }: UploadRowProps) {
  function make(accept: string, capture?: string) {
    return (
      <input
        type="file"
        accept={accept}
        {...(capture ? { capture: capture as "environment" } : {})}
        multiple
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onAdd(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    );
  }

  const btnCls =
    "flex cursor-pointer items-center gap-1.5 border-r border-[rgba(24,95,165,0.12)] px-3 py-[7px] text-[12px] text-muted-foreground transition-colors last:border-r-0 hover:bg-[#E6F1FB] hover:text-primary disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="mt-5">
      {/* Button group */}
      <div className="inline-flex overflow-hidden rounded-[9px] border border-[rgba(24,95,165,0.22)] bg-[#F7F9FC]">
        <label className={btnCls}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Photo
          {make("image/*")}
        </label>
        <label className={btnCls}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Camera
          {make("image/*", "environment")}
        </label>
        <label className={btnCls}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Video
          {make("video/*")}
        </label>
        <label className={btnCls}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          File
          {make("image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv")}
        </label>
      </div>

      {/* File preview chips */}
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-[rgba(24,95,165,0.15)] bg-[#F7F9FC] px-2.5 py-1.5"
            >
              <span className="max-w-[140px] truncate text-[11px] font-medium text-foreground">
                {f.name}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {fmt(f.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={disabled}
                aria-label={`Remove ${f.name}`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Background glow (original landing aesthetic) ─────────────────────────────

function AskLukeBackgroundGlow() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(24,95,165,0.05) 0%, transparent 70%)",
      }}
    />
  );
}

// ── ReasonScreen — original landing-page look (no journey bar) ────────────────

function ReasonScreen({
  initialReason,
  onContinue,
}: {
  initialReason?: string;
  onContinue: (reason: string) => void;
}) {
  const [reason, setReason] = useState(initialReason ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = reason.trim();

  return (
    <div className="relative flex min-h-svh flex-col bg-white">
      <AskLukeTopNav />
      <AskLukeBackgroundGlow />

      <main className="relative z-10 flex flex-1 flex-col px-4 pt-[60px] pb-8 sm:px-6">
        <div className="mx-auto mt-10 flex w-full max-w-[620px] flex-col items-center text-center">
          <AskLukeWordmark size="hero" />
          <p className="mt-2 text-[15px] font-light tracking-[0.01em] text-muted-foreground">
            navigate care with confidence
          </p>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-[620px] flex-1 flex-col items-center">
          <div
            className={cn(
              "w-full cursor-text overflow-hidden rounded-[14px] border-[1.5px] border-[rgba(24,95,165,0.2)] bg-white shadow-[0_2px_16px_rgba(24,95,165,0.06)] transition-[border-color,box-shadow] duration-200",
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
              placeholder="What is going on with your health today?"
              rows={3}
              className="block w-full resize-none bg-transparent px-5 pt-[18px] pb-3.5 text-[16px] leading-[1.55] text-foreground placeholder:text-[#A0AEC0] focus:outline-none"
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

          <TrendingPrompts
            onSelect={(text) => {
              setReason(text);
              textareaRef.current?.focus();
            }}
          />
          <LanguagePills />
        </div>
      </main>
    </div>
  );
}

function derivePreAttached(moduleResults: Record<string, unknown>) {
  const specIds = Object.values(moduleResults).flatMap((r) => {
    const result = r as { uploads?: Array<{ specId: string; files: unknown[] }> };
    return (result.uploads ?? []).filter((u) => u.files.length > 0).map((u) => u.specId);
  });
  return {
    healthCard: specIds.includes("health_card"),
    benefitsBooklet: specIds.includes("benefits_booklet"),
  };
}

// ── ChatScreen ────────────────────────────────────────────────────────────────

function ChatScreen({
  greetingName,
  initialReason,
  onReset,
}: {
  greetingName: string;
  initialReason: string;
  onReset: () => void;
}) {
  const [input, setInput] = useState("");
  const [encounterError, setEncounterError] = useState<Error | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [moduleResults, setModuleResults] = useState<Record<string, unknown>>({});
  const [browseIdx, setBrowseIdx] = useState<number>(0);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [review, setReview] = useState<PatientReview | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const reviewFetchedRef = useRef(false);
  const [manuallyComplete, setManuallyComplete] = useState(false);
  const [intakePhase, setIntakePhase] = useState<"chat" | "personalize" | "recommendation">("chat");
  const [reviewData, setReviewData] = useState<PatientReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const router = useRouter();

  const encounterIdRef = useRef<string | null>(null);
  const anonymousAccessTokenRef = useRef<string | undefined>(undefined);
  const seededRef = useRef(false);

  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        encounterId: encounterIdRef.current,
        ...(anonymousAccessTokenRef.current
          ? { anonymousAccessToken: anonymousAccessTokenRef.current }
          : {}),
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    createEncounter()
      .then(({ id, anonymousAccessToken }) => {
        encounterIdRef.current = id;
        anonymousAccessTokenRef.current = anonymousAccessToken;
        setEncounterId(id);
        sendMessage({ text: initialReason });
      })
      .catch((err) => {
        console.error("Failed to create encounter", err);
        setEncounterError(err instanceof Error ? err : new Error(String(err)));
      });
  }, [initialReason, sendMessage]);

  const turns = useMemo(() => deriveTurns(messages), [messages]);
  const pending = useMemo(() => findPendingToolCall(messages), [messages]);

  const markerComplete = useMemo(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant || status !== "ready") return false;
    const raw = lastAssistant.parts
      .filter(
        (p): p is Extract<MessagePart, { type: "text" }> => p.type === "text",
      )
      .map((p) => p.text ?? "")
      .join("");
    return raw.includes(COMPLETION_MARKER);
  }, [messages, status]);

  const isComplete = manuallyComplete || markerComplete;

  // Fetch review summary once when the intake completes.
  useEffect(() => {
    if (!isComplete || reviewFetchedRef.current) return;
    reviewFetchedRef.current = true;
    setReviewLoading(true);
    fetch("/api/intake/patient-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        moduleResults,
        greetingName,
        encounterId: encounterIdRef.current,
        anonymousAccessToken: anonymousAccessTokenRef.current,
      }),
    })
      .then((res) => res.json())
      .then((data) => setReview(data as PatientReview))
      .catch((err) =>
        setReviewError(err instanceof Error ? err.message : "Failed to load review"),
      )
      .finally(() => setReviewLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  const isStreaming = status === "submitted" || status === "streaming";

  // Always advance to the latest turn when a new question arrives.
  // The user can browse back with the prev button at any time.
  const latestIdx = Math.max(0, turns.length - 1);

  useEffect(() => {
    setBrowseIdx(latestIdx);
  }, [latestIdx]);

  // Reset attached files whenever the user moves to a different question.
  useEffect(() => {
    setAttachedFiles([]);
  }, [browseIdx]);

  // Poll for recommendation readiness, then navigate.
  useEffect(() => {
    if (intakePhase !== "recommendation") return;
    const eid = encounterIdRef.current;
    if (!eid) return;

    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        const ready = await isRecommendationReady(eid);
        if (ready && !cancelled) {
          handleContinueToRecommendation();
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [intakePhase]);

  const currentTurn = turns[browseIdx] ?? null;
  const isLatestTurn = browseIdx === latestIdx;
  const canEdit =
    isLatestTurn && currentTurn?.answer === null && !isStreaming && !pending && !uploading;

  const activeModule = pending ? findModule(pending.toolName) : undefined;

  // Progress: 15% at start of follow-up, up to 80% as turns accumulate.
  const totalEstimated = Math.max(5, turns.length + 1);
  const progressPct = isComplete
    ? 90
    : 15 + Math.min(65, (browseIdx / totalEstimated) * 65);

  // Journey step
  const journeyStep =
    intakePhase === "personalize" || intakePhase === "recommendation"
      ? intakePhase
      : isComplete
        ? "review"
        : "followup";

  function handleContinueToRecommendation() {
    const eid = encounterIdRef.current;
    if (!eid) return;
    const tokenParam = anonymousAccessTokenRef.current
      ? `?token=${anonymousAccessTokenRef.current}`
      : "";
    router.push(`/recommendations/${eid}${tokenParam}`);
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || !canEdit || uploading) return;

    let text = trimmed;

    if (attachedFiles.length > 0) {
      setUploading(true);
      try {
        const names: string[] = [];
        for (const f of attachedFiles) {
          const contentType = f.type || "application/octet-stream";
          const blob = await upload(f.name, f, {
            access: "private",
            handleUploadUrl: "/api/attachments/upload",
            contentType,
          });
          await recordAttachment({
            encounterId,
            url: blob.url,
            pathname: blob.pathname,
            originalFilename: f.name,
            contentType,
            sizeBytes: f.size,
            description: `Inline attachment for question ${browseIdx + 1}`,
          });
          names.push(f.name);
        }
        text = `${trimmed}\n\n(Attached: ${names.join(", ")})`;
      } catch (err) {
        console.error("File upload failed", err);
        // Continue sending without the attachment note rather than blocking.
      } finally {
        setUploading(false);
      }
    }

    sendMessage({ text });
    setInput("");
    setAttachedFiles([]);
  }

  // Skip: sends a placeholder so the model continues. Files are not uploaded on skip.
  function handleSkip() {
    if (!canEdit) return;
    sendMessage({ text: "Skip" });
    setInput("");
    setAttachedFiles([]);
  }

  const hasError = error || encounterError;

  return (
    <div className="relative min-h-svh bg-white">
      <AskLukeTopNav />
      <div className="fixed inset-x-0 top-[60px] z-50 border-b border-[rgba(24,95,165,0.12)] bg-white/95 pt-2 backdrop-blur-[10px]">
        <IntakeJourneyBar active={journeyStep} />
      </div>
      {/* <IntakeProgressBar percent={progressPct} /> */}

      <IntakeStage>
        {hasError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{(error ?? encounterError)?.message || "Something went wrong."}</p>
            </div>
            <button
              onClick={onReset}
              className="mt-3 rounded-lg border border-destructive/30 bg-white px-4 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : isComplete && intakePhase === "personalize" ? (
          // ── Personalize ──────────────────────────────────────────────────
          <PersonalizeScreen
            encounterId={encounterId}
            anonymousAccessToken={anonymousAccessTokenRef.current}
            preAttached={derivePreAttached(moduleResults)}
            onComplete={() => setIntakePhase("recommendation")}
          />
        ) : isComplete && intakePhase === "recommendation" ? (
          // ── Waiting for recommendation to generate, then navigating ──────
          <div className="flex flex-col items-center gap-6 py-24">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating your recommendation…</p>
          </div>
        ) : isComplete ? (
          // ── Redirecting to recommendation page ─────────────────────────
          <div
            key="complete"
            className="flex flex-col items-center gap-4 py-16"
          >
            {!review && !reviewError ? (
              <IntakeReviewSummarySkeleton />
            ) : reviewError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>{reviewError}</p>
                </div>
                <button
                  onClick={onReset}
                  className="mt-3 rounded-lg border border-destructive/30 bg-white px-4 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : review ? (
              <IntakeReviewSummary review={review} />
            ) : null}
            <DownloadPdfButton
              messages={messages}
              greetingName={greetingName}
              moduleResults={moduleResults}
            />
            <button
              type="button"
              onClick={() => setIntakePhase("personalize")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_3px_14px_rgba(24,95,165,0.22)] transition-all hover:bg-[#0e4a87] hover:-translate-y-px active:scale-[0.98]"
            >
              Continue to personalize
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <PostIntakeAccountPrompt />
          </div>
        ) : pending && activeModule ? (
          // ── Module stage ─────────────────────────────────────────────────
          <div
            key={pending.toolCallId}
            className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
          >
            <activeModule.Component
              args={pending.input}
              encounterId={encounterId}
              onComplete={(result) => {
                setModuleResults((prev) => ({
                  ...prev,
                  [pending.toolCallId]: result,
                }));
                addToolOutput({
                  tool: pending.toolName,
                  toolCallId: pending.toolCallId,
                  output: activeModule.formatResultForLLM(result),
                });
              }}
            />
          </div>
        ) : pending && SERVER_SIDE_TOOLS.has(pending.toolName) ? (
          <div className="mr-auto rounded-2xl border border-[rgba(24,95,165,0.12)] bg-[#F7F9FC] px-4 py-2.5 text-sm text-muted-foreground">
            <CyclingStatus
              phrases={
                pending.toolName === "generate_recommendation"
                  ? RECOMMENDATION_PHRASES
                  : EVALUATE_PHRASES
              }
            />
          </div>
        ) : pending ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>AI called an unknown tool ({pending.toolName}). Check the module registry.</p>
          </div>
        ) : isStreaming && turns.length === 0 ? (
          // ── Initial thinking ─────────────────────────────────────────────
          <div className="animate-pulse text-sm text-muted-foreground">
            Thinking…
          </div>
        ) : currentTurn ? (
          // ── Question stage ───────────────────────────────────────────────
          <div
            key={browseIdx}
            className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
          >
            <QNumber n={browseIdx + 1} />
            <QText>{currentTurn.question}</QText>

            {/* Rationale balloon — only when the AI provided one */}
            {currentTurn.rationale && (
              <RationaleBalloon text={currentTurn.rationale} />
            )}

            {isStreaming && isLatestTurn && currentTurn.answer === null ? (
              <div className="animate-pulse text-sm text-muted-foreground">
                Thinking…
              </div>
            ) : canEdit || uploading ? (
              // Editable input for latest unanswered question
              <>
                <AnswerInput
                  value={input}
                  onChange={setInput}
                  onEnter={handleSend}
                  autoFocus={canEdit}
                  disabled={uploading}
                />
                <UploadRow
                  files={attachedFiles}
                  onAdd={(incoming) =>
                    setAttachedFiles((prev) => {
                      const names = new Set(prev.map((f) => f.name));
                      return [...prev, ...incoming.filter((f) => !names.has(f.name))];
                    })
                  }
                  onRemove={(i) =>
                    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  disabled={uploading}
                />
                <ActionRow
                  onOk={handleSend}
                  okDisabled={!input.trim() || uploading}
                  okLabel={
                    uploading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" />
                        Uploading…
                      </span>
                    ) : (
                      "OK"
                    )
                  }
                  onSkip={handleSkip}
                  showSkip={!uploading}
                />
              </>
            ) : (
              // Read-only view of a past answer (or waiting for stream)
              currentTurn.answer && (
                <p className="border-b-2 border-[rgba(24,95,165,0.12)] pb-2.5 pt-2.5 text-[18px] font-light leading-relaxed text-foreground/70">
                  {currentTurn.answer}
                </p>
              )
            )}
          </div>
        ) : null}
        {/* {!isComplete && status === "ready" && !isStreaming && !pending && turns.length > 0 && (
          <button
            type="button"
            onClick={() => setManuallyComplete(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_3px_14px_rgba(24,95,165,0.22)] transition-all hover:bg-[#0e4a87] hover:-translate-y-px active:scale-[0.98]"
          >
            Continue to review
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )} */}
      </IntakeStage>

      {/* Bottom nav — hidden on completion */}
      {!isComplete && turns.length > 0 && (
        <IntakeBottomNav
          current={browseIdx + 1}
          total={turns.length}
          onPrev={() => setBrowseIdx((i) => Math.max(0, i - 1))}
          onNext={() => setBrowseIdx((i) => Math.min(latestIdx, i + 1))}
          prevDisabled={browseIdx === 0}
          nextDisabled={browseIdx >= latestIdx}
        />
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export function AiIntakeScreen({ greetingName, initialReason }: Props) {
  const [step, setStep] = useState<Step>(initialReason ? "chat" : "reason");
  const [reason, setReason] = useState(initialReason ?? "");

  if (step === "reason") {
    return (
      <ReasonScreen
        initialReason={reason}
        onContinue={(r) => {
          setReason(r);
          setStep("chat");
        }}
      />
    );
  }

  return (
    <ChatScreen
      greetingName={greetingName}
      initialReason={reason}
      onReset={() => setStep("reason")}
    />
  );
}
