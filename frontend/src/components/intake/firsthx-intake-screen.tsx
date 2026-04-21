"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitAnswer, goBack } from "@/app/actions/firsthx";
import type { IntakeContent, IntakeOption, IntakeState } from "@/lib/firsthx";

type Props = {
  greetingName: string;
  initialState: IntakeState | null;
  initError: string | null;
};

type Step = "reason" | "questions";

function buildSelectedOptions(
  content: IntakeContent,
  selectedIds: number[],
): Pick<IntakeOption, "id" | "displayText" | "originalText">[] {
  return content.options
    .filter((opt) => selectedIds.includes(opt.id))
    .map(({ id, displayText, originalText }) => ({ id, displayText, originalText }));
}

function FirstHxBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-black/5 px-2.5 py-1 text-[11px] font-medium text-foreground/50 tracking-wide">
      <svg width="9" height="9" viewBox="0 0 10 10" className="shrink-0" aria-hidden>
        <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M5 2.5v2.8L6.8 6.5" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </svg>
      Powered by <strong className="text-foreground/70">firstHx</strong>
    </span>
  );
}

// ── Reason-for-visit screen ───────────────────────────────────
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
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            Intake Assessment
          </p>
          <h1 className="mt-0.5 text-lg font-semibold text-foreground">
            Hi {greetingName}
          </h1>
        </div>
        <FirstHxBadge />
      </header>

      {/* Card */}
      <div
        className="intake-glass flex flex-grow flex-col gap-5 rounded-2xl p-6 sm:p-8"
      >
        <div>
          <h2 className="text-[22px] font-semibold leading-snug tracking-tight text-foreground">
            What&apos;s going on today?
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            A few words is plenty — we&apos;ll ask follow-up questions from there.
          </p>
        </div>

        {/* Text area */}
        <div
          className="relative flex-grow cursor-text rounded-xl border border-white/60 bg-white/30 p-4 transition-colors focus-within:border-primary/40 focus-within:bg-white/50"
          onClick={() => textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what you're experiencing…"
            className="h-full min-h-[140px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-foreground placeholder:text-foreground/35 focus:outline-none"
          />
        </div>

        {/* Continue */}
        <div className="flex items-center justify-end pt-1">
          <Button
            type="button"
            size="lg"
            disabled={!trimmed}
            onClick={() => onContinue(trimmed)}
            className="hover:bg-primary/90 active:scale-[0.98] active:bg-primary/80"
          >
            Continue
          </Button>
        </div>
      </div>
    </main>
  );
}

// ── Questions screen ──────────────────────────────────────────
export function FirstHxIntakeScreen({ greetingName, initialState, initError }: Props) {
  const [step, setStep] = useState<Step>("reason");
  const [state, setState] = useState<IntakeState | null>(initialState);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(initError);
  const [isPending, startTransition] = useTransition();

  const content = state?.content;
  const isMulti = content?.type === "multiSelect";
  const isCompleted = state?.intakeStatus === "completed";
  const canSubmit = selectedIds.length > 0 || (content && !content.inputRequired);

  function toggleOption(optionId: number, deselectOthers?: boolean) {
    if (isMulti) {
      if (deselectOthers) {
        setSelectedIds([optionId]);
      } else {
        setSelectedIds((prev) =>
          prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
        );
      }
    } else {
      setSelectedIds([optionId]);
    }
  }

  function handleSubmit() {
    if (!state || !content || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const next = await submitAnswer(
          state.mkey,
          content.id,
          buildSelectedOptions(content, selectedIds),
        );
        setState(next);
        setSelectedIds([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit answer");
      }
    });
  }

  function handleBack() {
    if (!state || !content?.backAllowed || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const prev = await goBack(state.mkey);
        setState(prev);
        setSelectedIds([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to go back");
      }
    });
  }

  // Show reason-for-visit screen first
  if (step === "reason") {
    return (
      <ReasonScreen
        greetingName={greetingName}
        onContinue={() => setStep("questions")}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:py-12">
      {/* Header row */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
            Intake Assessment
          </p>
          <h1 className="mt-0.5 text-lg font-semibold text-foreground">
            Hi {greetingName}
          </h1>
        </div>
        <FirstHxBadge />
      </header>

      {/* Content area */}
      {error ? (
        <div className="intake-glass flex items-start gap-3 rounded-2xl p-5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : isCompleted ? (
        <div className="intake-glass flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center">
          <CheckCircle2 className="size-10 text-primary" />
          <div>
            <p className="text-base font-semibold text-foreground">Assessment Complete</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thank you for completing the intake assessment.
            </p>
          </div>
        </div>
      ) : content ? (
        <div className="intake-glass flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
          {/* Question */}
          <div className="space-y-1.5">
            <h2 className="text-[17px] font-semibold leading-snug text-foreground">
              {content.title}
            </h2>
            {content.helperText && (
              <p className="text-sm text-muted-foreground">{content.helperText}</p>
            )}
            {isMulti && (
              <p className="text-xs text-muted-foreground/70">Select all that apply</p>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2">
            {content.options.map((option) => {
              const isSelected = selectedIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id, option.deselectOtherAnswers)}
                  disabled={isPending}
                  className={cn(
                    "intake-option",
                    isSelected && "intake-option-selected",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-foreground/25 bg-transparent",
                      )}
                    >
                      {isSelected && (
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                          <path d="M1 4l2.2 2.2L7 1.5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            {content.backAllowed && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleBack}
                disabled={isPending}
                className="border-white/60 bg-white/50 backdrop-blur-sm hover:border-primary/30 hover:bg-white/70 active:scale-[0.98] active:bg-white/60"
              >
                <ChevronLeft className="mr-1 size-4" />
                Back
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              onClick={handleSubmit}
              disabled={isPending || !canSubmit}
              className="ml-auto hover:bg-primary/90 active:scale-[0.98] active:bg-primary/80"
            >
              {isPending ? "Loading…" : "Continue"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="intake-glass flex items-center justify-center rounded-2xl px-6 py-16">
          <p className="text-sm text-muted-foreground">Starting your session…</p>
        </div>
      )}
    </main>
  );
}
