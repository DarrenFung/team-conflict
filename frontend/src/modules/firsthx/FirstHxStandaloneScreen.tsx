"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AskLukeTopNav } from "@/components/layout/ask-luke-top-nav";
import {
  IntakeJourneyBar,
  IntakeProgressBar,
  IntakeBottomNav,
  IntakeStage,
  IntakeStepReporterContext,
} from "@/components/intake/intake-journey-shell";
import { FirstHxPanel } from "./FirstHxPanel";
import type { FirstHxResult, FirstHxTurn } from "./index";

type Props = {
  greetingName: string;
};

import { useRef } from "react";
import { Button } from "@/components/ui/button";

type Step = "reason" | "questions" | "complete";

// ── PageHeader (original FirstHx brand) ───────────────────────────────────────

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
      Powered by <strong className="text-foreground/70">firstHx</strong>
    </span>
  );
}

function PageHeader({ greetingName }: { greetingName: string }) {
  return (
    <header className="mb-8 flex items-center justify-between">
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

// ── ReasonScreen — original intake-glass look (no journey bar) ────────────────

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
      <PageHeader greetingName={greetingName} />
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

// ── CompletionScreen ──────────────────────────────────────────────────────────

function CompletionScreen({
  reason,
  turns,
}: {
  reason: string;
  turns: FirstHxTurn[];
}) {
  return (
    <div className="relative min-h-svh bg-white">
      <AskLukeTopNav />
      <div className="fixed inset-x-0 top-[60px] z-50 border-b border-[rgba(24,95,165,0.12)] bg-white/95 pt-2 backdrop-blur-[10px]">
        <IntakeJourneyBar active="review" />
      </div>
      <IntakeProgressBar percent={90} />

      <IntakeStage>
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="size-9 text-primary drop-shadow-[0_2px_8px_rgba(24,95,165,0.2)]" />
            <p className="font-[family-name:var(--font-dm-serif)] text-lg text-foreground">
              Assessment complete
            </p>
            <p className="text-xs text-muted-foreground">
              Thank you for completing your intake.
            </p>
          </div>

          {(reason || turns.length > 0) && (
            <div className="space-y-5 border-t border-[rgba(24,95,165,0.12)] pt-6 text-left">
              {reason && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    What&apos;s going on today
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {reason}
                  </p>
                </section>
              )}
              {turns.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your responses
                  </h3>
                  <ul className="mt-3 space-y-4">
                    {turns.map((turn, i) => (
                      <li key={`${turn.question}-${i}`}>
                        <p className="text-[13px] font-medium text-foreground/90">
                          {turn.question}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {turn.display}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </IntakeStage>
    </div>
  );
}

// ── QuestionsScreen ───────────────────────────────────────────────────────────

function QuestionsScreen({
  reason,
  onComplete,
}: {
  reason: string;
  onComplete: (result: FirstHxResult) => void;
}) {
  const [stepCurrent, setStepCurrent] = useState(1);
  const [stepTotal, setStepTotal] = useState(1);

  return (
    <IntakeStepReporterContext.Provider
      value={{
        reportStep: (current, total) => {
          setStepCurrent(current);
          setStepTotal(total);
        },
      }}
    >
      <div className="relative min-h-svh bg-white">
        <AskLukeTopNav />
        <div className="fixed inset-x-0 top-[60px] z-50 border-b border-[rgba(24,95,165,0.12)] bg-white/95 pt-2 backdrop-blur-[10px]">
          <IntakeJourneyBar active="followup" />
        </div>
        <IntakeProgressBar
          percent={15 + Math.min(65, (stepCurrent / Math.max(stepTotal, 1)) * 65)}
        />

        <IntakeStage>
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <FirstHxPanel
              args={{ symptomHint: reason }}
              encounterId={null}
              onComplete={onComplete}
            />
          </div>
        </IntakeStage>

        <IntakeBottomNav
          current={stepCurrent}
          total={stepTotal}
          onPrev={() => {}}
          onNext={() => {}}
          prevDisabled
          nextDisabled
        />
      </div>
    </IntakeStepReporterContext.Provider>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export function FirstHxStandaloneScreen({ greetingName }: Props) {
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<FirstHxResult | null>(null);

  if (step === "reason") {
    return (
      <ReasonScreen
        greetingName={greetingName}
        onContinue={(r) => {
          setReason(r);
          setStep("questions");
        }}
      />
    );
  }

  if (step === "complete" && result) {
    return <CompletionScreen reason={reason} turns={result.turns} />;
  }

  return (
    <QuestionsScreen
      reason={reason}
      onComplete={(r) => {
        setResult(r);
        setStep("complete");
      }}
    />
  );
}
