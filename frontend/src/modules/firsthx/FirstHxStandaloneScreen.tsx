"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FirstHxPanel } from "./FirstHxPanel";
import type { FirstHxResult, FirstHxTurn } from "./index";

type Props = {
  greetingName: string;
};

type Step = "reason" | "questions" | "complete";

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

function CompletionScreen({
  greetingName,
  reason,
  turns,
}: {
  greetingName: string;
  reason: string;
  turns: FirstHxTurn[];
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:py-12">
      <PageHeader greetingName={greetingName} />
      <div className="intake-glass flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
          <CheckCircle2 className="mx-auto size-10 shrink-0 text-primary sm:mx-0" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">Assessment Complete</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {reason || turns.length > 0
                ? "Thank you for completing the intake assessment. Here is what you shared with us."
                : "Thank you for completing the intake assessment."}
            </p>
          </div>
        </div>

        {(reason || turns.length > 0) && (
          <div className="space-y-5 border-t border-black/8 pt-6 text-left">
            {reason ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  What&apos;s going on today
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {reason}
                </p>
              </section>
            ) : null}
            {turns.length > 0 ? (
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
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

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
    return (
      <CompletionScreen greetingName={greetingName} reason={reason} turns={result.turns} />
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:py-12">
      <PageHeader greetingName={greetingName} />
      <div className="intake-glass flex flex-grow flex-col gap-2 rounded-2xl p-6 sm:p-8">
        <FirstHxPanel
          args={{ symptomHint: reason }}
          encounterId={null}
          onComplete={(r) => {
            setResult(r);
            setStep("complete");
          }}
        />
      </div>
    </main>
  );
}
