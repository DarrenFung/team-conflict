"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  goBack as goBackAction,
  startIntakeSession,
  submitAnswer,
  type AnswerData,
} from "@/app/actions/firsthx";
import type { IntakeContent, IntakeOption, IntakeState } from "@/lib/firsthx";
import type { ModuleComponentProps } from "../types";
import type { FirstHxArgs, FirstHxResult, FirstHxTurn } from "./index";

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

function buildSelectedOptions(
  content: IntakeContent,
  selectedIds: number[],
): Pick<IntakeOption, "id" | "displayText" | "originalText">[] {
  return (content.options ?? [])
    .filter((opt) => selectedIds.includes(opt.id))
    .map(({ id, displayText, originalText }) => ({ id, displayText, originalText }));
}

export function FirstHxPanel({
  onComplete,
}: ModuleComponentProps<FirstHxArgs, FirstHxResult>) {
  const [state, setState] = useState<IntakeState | null>(null);
  const [turns, setTurns] = useState<FirstHxTurn[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [pending, startTransition] = useTransition();

  // Kick off the firstHx session on mount
  useEffect(() => {
    let cancelled = false;
    startIntakeSession(crypto.randomUUID())
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to start firstHx");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const content = state?.content;
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

  if (loadError) {
    return (
      <div className="flex items-start gap-2 border-t border-white/40 pt-4 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>{loadError}</p>
      </div>
    );
  }

  if (!state || !content) {
    return (
      <div className="border-t border-white/40 px-1 pt-4 text-sm text-muted-foreground">
        Starting structured symptom capture…
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

  function buildAnswerAndDisplay(c: IntakeContent): { answer: AnswerData; display: string } | null {
    const t = c.type;
    if (isInfoType(t)) return { answer: { kind: "options", options: [] }, display: "Continued" };
    if (isFreeTextType(t)) {
      const text = textValue.trim();
      return { answer: { kind: "text", text }, display: text || "—" };
    }
    if (isNumberType(t)) {
      const n = Number(numberValue);
      if (Number.isNaN(n)) return null;
      const display = selectedUnit ? `${n} ${selectedUnit}` : String(n);
      return { answer: { kind: "number", number: n, unit: selectedUnit }, display };
    }
    const selected = buildSelectedOptions(c, selectedIds);
    const display = selected.map((o) => o.displayText).join(", ") || "—";
    return { answer: { kind: "options", options: selected }, display };
  }

  function handleSubmit() {
    if (!state || !content || !canSubmit) return;
    const built = buildAnswerAndDisplay(content);
    if (!built) return;

    startTransition(async () => {
      try {
        setOpError(null);
        const next = await submitAnswer(state.mkey, content.id, built.answer);
        const turn: FirstHxTurn = { question: content.title, display: built.display };
        const nextTurns = [...turns, turn];
        setTurns(nextTurns);

        if (next.intakeStatus === "completed") {
          onComplete({ turns: nextTurns });
        } else {
          setState(next);
        }
      } catch (err) {
        setOpError(err instanceof Error ? err.message : "Failed to submit answer");
      }
    });
  }

  function handleBack() {
    if (!state || !content?.backAllowed) return;
    startTransition(async () => {
      try {
        setOpError(null);
        const prev = await goBackAction(state.mkey, content.id);
        setState(prev);
        setTurns((t) => t.slice(0, -1));
      } catch (err) {
        setOpError(err instanceof Error ? err.message : "Failed to go back");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 border-t border-white/40 pt-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">
          firstHx structured capture
        </p>
        {content.title && (
          <h3 className="mt-1 text-[16px] font-semibold leading-snug text-foreground">
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

      {opError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{opError}</p>
        </div>
      )}

      {isFreeTextType(type) ? (
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          disabled={pending}
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
            disabled={pending}
            placeholder="Enter a number"
            className="w-full rounded-xl border border-white/60 bg-white/30 px-4 py-3 text-[15px] text-foreground placeholder:text-foreground/35 focus:border-primary/40 focus:bg-white/50 focus:outline-none"
          />
          {content.units && content.units.length > 0 && (
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={pending}
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
                disabled={pending}
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
            onClick={handleBack}
            disabled={pending}
          >
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          disabled={pending || !canSubmit}
          className="ml-auto"
        >
          {pending ? "Loading…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
