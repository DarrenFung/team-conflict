"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { submitAnswer, goBack } from "@/app/actions/firsthx";
import type { IntakeContent, IntakeOption, IntakeState } from "@/lib/firsthx";

type Props = {
  greetingName: string;
  initialState: IntakeState | null;
  initError: string | null;
};

function buildSelectedOptions(
  content: IntakeContent,
  selectedIds: number[],
): Pick<IntakeOption, "id" | "displayText" | "originalText">[] {
  return content.options
    .filter((opt) => selectedIds.includes(opt.id))
    .map(({ id, displayText, originalText }) => ({ id, displayText, originalText }));
}

export function FirstHxIntakeScreen({ greetingName, initialState, initError }: Props) {
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

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[680px] flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <section className="glass-panel flex items-center justify-between gap-4 rounded-2xl p-4 md:p-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">Intake Assessment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, {greetingName}. Answer each question to complete your assessment.
          </p>
        </div>
      </section>

      {error ? (
        <Card className="glass-panel border-white/35 shadow-none">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : isCompleted ? (
        <Card className="glass-panel border-white/35 shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-14">
            <CheckCircle2 className="size-12 text-primary" />
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Assessment Complete</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Thank you for completing the intake assessment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : content ? (
        <Card className="glass-panel border-white/35 shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium leading-relaxed">{content.title}</CardTitle>
            {content.helperText && (
              <CardDescription>{content.helperText}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              {content.options.map((option) => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id, option.deselectOtherAnswers)}
                    disabled={isPending}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-white/35 bg-white/40 text-foreground hover:bg-primary/5 dark:bg-black/20",
                      isPending && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {option.displayText}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {content.backAllowed && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isPending}
                  className="border-primary/35 bg-white/55 text-foreground hover:bg-primary/10 active:bg-primary/20"
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !canSubmit}
                className="ml-auto bg-primary text-primary-foreground hover:bg-primary/85 active:scale-[0.99] active:bg-primary/75"
              >
                {isPending ? "Loading..." : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-panel border-white/35 shadow-none">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Starting your intake session...</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
