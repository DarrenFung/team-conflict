"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Journey step types ────────────────────────────────────────────────────────

export type JourneyStep =
  | "concern"
  | "followup"
  | "review"
  | "personalize"
  | "recommendation";

const STEPS: { key: JourneyStep; label: string }[] = [
  { key: "concern", label: "Your concern" },
  { key: "followup", label: "Follow-up" },
  { key: "review", label: "Review" },
  { key: "personalize", label: "Personalize" },
  { key: "recommendation", label: "Recommendation" },
];

function stepStatus(
  key: JourneyStep,
  active: JourneyStep,
): "done" | "active" | "pending" {
  const keys = STEPS.map((s) => s.key);
  const activeIdx = keys.indexOf(active);
  const thisIdx = keys.indexOf(key);
  if (thisIdx < activeIdx) return "done";
  if (thisIdx === activeIdx) return "active";
  return "pending";
}

// ── IntakeJourneyBar ──────────────────────────────────────────────────────────

export function IntakeJourneyBar({ active }: { active: JourneyStep }) {
  return (
    <div className="flex items-center justify-center overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STEPS.map((step, i) => {
        const status = stepStatus(step.key, active);
        return (
          <div key={step.key} className="flex shrink-0 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-all duration-200",
                  status === "done" &&
                    "border-[#0F6E56] bg-[#0F6E56] text-white",
                  status === "active" && "border-primary bg-primary text-white",
                  status === "pending" &&
                    "border-[#dde3ed] bg-white text-[#bcc5d4]",
                )}
              >
                {status === "done" ? (
                  <Check className="size-[10px] stroke-[2.5]" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px]",
                  status === "done" && "text-[#0F6E56]",
                  status === "active" && "font-semibold text-primary",
                  status === "pending" && "font-normal text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-0.5 mb-3.5 h-0.5 w-9 shrink-0 rounded-full",
                  status === "done"
                    ? "bg-[#0F6E56]"
                    : "bg-[rgba(24,95,165,0.22)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── IntakeProgressBar ─────────────────────────────────────────────────────────
// Sits at a fixed position just below the combined header (nav + journey bar).
// top-[96px] mirrors the HTML mock's measured value.

export function IntakeProgressBar({ percent }: { percent: number }) {
  return (
    <div className="fixed left-0 right-0 top-[96px] z-[99] h-[3px] bg-[#e5e7eb]">
      <div
        className="h-full transition-[width] duration-500 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, percent))}%`,
          background: "linear-gradient(90deg, #185FA5, #534AB7)",
        }}
      />
    </div>
  );
}

// ── IntakeBottomNav ───────────────────────────────────────────────────────────

export type IntakeBottomNavProps = {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
};

export function IntakeBottomNav({
  current,
  total,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: IntakeBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-[rgba(24,95,165,0.12)] bg-white/95 px-8 py-2.5 backdrop-blur-[10px]">
      <p className="text-xs text-muted-foreground">
        <strong className="text-foreground">{current}</strong> / {total}
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label="Previous question"
          className="flex size-8 items-center justify-center rounded-md border border-[rgba(24,95,165,0.22)] bg-white text-muted-foreground transition-colors hover:bg-[#F7F9FC] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="Next question"
          className="flex size-8 items-center justify-center rounded-md border border-[rgba(24,95,165,0.22)] bg-white text-muted-foreground transition-colors hover:bg-[#F7F9FC] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── IntakeStepReporterContext ─────────────────────────────────────────────────
// Modules (e.g. FirstHxPanel) call reportStep() to push their current step
// counts up to whatever shell is rendering them, so the bottom nav / progress
// can reflect module-internal progress without changing ModuleComponentProps.

type StepReporterCtx = {
  reportStep: (current: number, total: number) => void;
};

export const IntakeStepReporterContext =
  createContext<StepReporterCtx | null>(null);

export function useIntakeStepReporter(): StepReporterCtx | null {
  return useContext(IntakeStepReporterContext);
}

// ── IntakeStage ───────────────────────────────────────────────────────────────
// Reusable centered stage wrapper (header offset + bottom nav offset).

export function IntakeStage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 pt-[110px] pb-[88px] sm:px-8">
      <div className="w-full max-w-[580px]">{children}</div>
    </main>
  );
}
