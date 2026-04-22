"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  goBack as goBackAction,
  startIntakeSession,
  submitAnswer,
  type AnswerData,
} from "@/app/actions/firsthx";
import type { IntakeContent, IntakeOption, IntakeState } from "@/lib/firsthx";
import { useIntakeStepReporter } from "@/components/intake/intake-journey-shell";
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

// ── Rationale balloon (helper text) ──────────────────────────────────────────

function RationaleBalloon({ text }: { text: string }) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mb-6 inline-flex max-w-[420px] items-start gap-2 rounded-[0_10px_10px_10px] border border-[rgba(24,95,165,0.15)] bg-[#E6F1FB] px-3.5 py-2.5 text-[12px] leading-[1.55] text-[#0e4a87]">
      {/* "L" circle — keeps the AskLuke brand subtly */}
      <span
        aria-hidden
        className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-dm-serif)] text-[10px] text-white"
      >
        L
      </span>
      {text}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stepReporter = useIntakeStepReporter();

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

  // Reset input state when question changes
  useEffect(() => {
    setSelectedIds([]);
    setTextValue("");
    setNumberValue("");
    setSelectedUnit("");
    // Refocus textarea for free-text questions
    if (content && isFreeTextType(content.type)) {
      const t = setTimeout(() => textareaRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [contentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (content && isNumberType(content.type) && !selectedUnit && content.units?.[0]) {
      setSelectedUnit(content.units[0]);
    }
  }, [content, selectedUnit]);

  // Report current step progress to any parent shell
  useEffect(() => {
    if (!stepReporter) return;
    // total is unknown from the API; use turns + 1 as a minimum
    stepReporter.reportStep(turns.length + 1, Math.max(turns.length + 1, 5));
  }, [turns.length, stepReporter]);

  // ── Error / loading ─────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex items-start gap-2 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>{loadError}</p>
      </div>
    );
  }

  if (!state || !content) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Starting structured symptom capture…
      </div>
    );
  }

  // ── Derived state ───────────────────────────────────────────────────────

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

  const canSkip = !content.inputRequired && !isInfoType(type);

  // ── Interaction handlers ────────────────────────────────────────────────

  function toggle(optionId: number, deselectOthers?: boolean) {
    if (isMulti && !deselectOthers) {
      setSelectedIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId],
      );
    } else {
      setSelectedIds([optionId]);
    }
  }

  function buildAnswerAndDisplay(
    c: IntakeContent,
  ): { answer: AnswerData; display: string } | null {
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

  function handleSkip() {
    if (!state || !content) return;
    startTransition(async () => {
      try {
        setOpError(null);
        const next = await submitAnswer(state.mkey, content.id, {
          kind: "options",
          options: [],
        });
        const turn: FirstHxTurn = { question: content.title, display: "—" };
        const nextTurns = [...turns, turn];
        setTurns(nextTurns);

        if (next.intakeStatus === "completed") {
          onComplete({ turns: nextTurns });
        } else {
          setState(next);
        }
      } catch (err) {
        setOpError(err instanceof Error ? err.message : "Failed to skip");
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

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      key={contentId}
      className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300 flex flex-col gap-0"
    >
      {/* Question number */}
      <p className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-primary opacity-80">
        Question {turns.length + 1}
      </p>

      {/* Question title in large serif */}
      {content.title && (
        <h2 className="mb-6 font-[family-name:var(--font-dm-serif)] text-[clamp(22px,3.8vw,32px)] leading-[1.3] tracking-[-0.4px] text-[#0E1420]">
          {content.title}
        </h2>
      )}

      {/* Helper text as rationale balloon */}
      {content.helperText && <RationaleBalloon text={content.helperText} />}

      {/* Multi-select hint */}
      {isMulti && (
        <p className="mb-4 text-xs text-muted-foreground">Select all that apply</p>
      )}

      {/* HTML content block */}
      {content.html && (
        <div
          className="prose prose-sm mb-4 max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      )}

      {/* Operation error */}
      {opError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{opError}</p>
        </div>
      )}

      {/* ── Answer inputs ─────────────────────────────────────────────── */}

      {isFreeTextType(type) ? (
        // Underline textarea matching the HTML mock style
        <textarea
          ref={textareaRef}
          value={textValue}
          rows={1}
          onChange={(e) => {
            setTextValue(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 200) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canSubmit) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={pending}
          placeholder={
            content.inputRequired ? "Type your answer…" : "Type your answer (optional)…"
          }
          className="block w-full resize-none overflow-hidden border-0 border-b-2 border-[rgba(24,95,165,0.2)] bg-transparent pb-2.5 pt-2.5 text-[18px] font-light leading-relaxed text-foreground placeholder:text-[#C0C8D2] focus:border-primary focus:outline-none transition-colors duration-200 disabled:opacity-60"
        />
      ) : isNumberType(type) ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            type="number"
            value={numberValue}
            min={0}
            onChange={(e) => setNumberValue(e.target.value.replace(/-/g, ""))}
            disabled={pending}
            placeholder="Enter a number"
            className="w-full border-0 border-b-2 border-[rgba(24,95,165,0.2)] bg-transparent pb-2.5 pt-2.5 text-[18px] font-light text-foreground placeholder:text-[#C0C8D2] focus:border-primary focus:outline-none transition-colors duration-200"
          />
          {content.units && content.units.length > 0 && (
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={pending}
              className="rounded-lg border border-[rgba(24,95,165,0.22)] bg-[#F7F9FC] px-3 py-2 text-[14px] text-foreground focus:border-primary focus:outline-none sm:w-36"
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
                className={cn(
                  "flex flex-col items-start rounded-xl border px-4 py-3 text-left text-[15px] transition-all",
                  isSelected
                    ? "border-primary bg-[#E6F1FB] text-primary shadow-sm"
                    : "border-[rgba(24,95,165,0.18)] bg-white text-foreground hover:border-primary/40 hover:bg-[#F7F9FC]",
                  "disabled:pointer-events-none disabled:opacity-60",
                )}
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

      {/* ── Action row ────────────────────────────────────────────────── */}
      <div className="mt-8 flex items-center gap-4">
        {content.backAllowed && (
          <button
            type="button"
            onClick={handleBack}
            disabled={pending}
            className="rounded-lg border border-[rgba(24,95,165,0.22)] bg-white px-5 py-3 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-[#F7F9FC] hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            ← Back
          </button>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !canSubmit}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-[15px] font-medium text-white shadow-[0_3px_14px_rgba(24,95,165,0.22)] transition-all hover:bg-[#0e4a87] hover:-translate-y-px disabled:pointer-events-none disabled:opacity-40"
        >
          {pending ? "Loading…" : isInfoType(type) ? "Continue" : "OK"}
          {!pending && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {canSkip && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={pending}
            className="bg-transparent border-none text-[13px] text-muted-foreground px-1 py-1 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
