"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitAnswer, goBack, type AnswerData } from "@/app/actions/firsthx";
import type { IntakeContent, IntakeOption, IntakeState } from "@/lib/firsthx";
import { PostIntakeAccountPrompt } from "@/components/intake/post-intake-account-prompt";

type Props = {
  greetingName: string;
  initialState: IntakeState | null;
  initError: string | null;
};

type Step = "reason" | "questions";

// ── Helpers ───────────────────────────────────────────────────

function isSelectType(type: string) {
  return (
    type === "selectOne" ||
    type === "selectOneBodyPart" ||
    type === "languageSelectOne" ||
    type === "consent" ||
    type === "selectAll" ||
    type === "selectAllBodyParts"
  );
}

function isMultiSelectType(type: string) {
  return type === "selectAll" || type === "selectAllBodyParts";
}

function isFreeTextType(type: string) {
  return type === "freeTextForm" || type === "freeTextRfv";
}

function isNumberType(type: string) {
  return type === "numberForm" || type === "numberFormSlider";
}

function buildOptionsAnswer(
  content: IntakeContent,
  selectedIds: number[],
): Pick<IntakeOption, "id" | "displayText" | "originalText">[] {
  return (content.options ?? [])
    .filter((opt) => selectedIds.includes(opt.id))
    .map(({ id, displayText, originalText }) => ({ id, displayText, originalText }));
}

type LoggedAnswer = { title: string; detail: string };

function formatAnswerForLog(content: IntakeContent, answer: AnswerData): string {
  switch (answer.kind) {
    case "text":
      return answer.text.trim() || "—";
    case "number": {
      const u = answer.unit?.trim();
      return u ? `${answer.number} ${u}` : String(answer.number);
    }
    case "options": {
      if (content.type === "text") return "Continued";
      const labels = answer.options.map((o) => o.displayText).filter(Boolean);
      return labels.length > 0 ? labels.join(", ") : "—";
    }
    default:
      return "—";
  }
}

function canSubmitForType(
  content: IntakeContent,
  selectedIds: number[],
  textValue: string,
  numberValue: string,
): boolean {
  const type = content.type;
  if (type === "text") return true;
  if (isFreeTextType(type)) return !content.inputRequired || textValue.trim().length > 0;
  if (isNumberType(type)) return numberValue !== "" && !Number.isNaN(Number(numberValue));
  // selectOne / selectAll / consent etc.
  return selectedIds.length > 0;
}

// ── Sub-components ────────────────────────────────────────────

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
            placeholder="Describe what you're experiencing…"
            className="h-full min-h-[140px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-foreground placeholder:text-foreground/35 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-end pt-1">
          <Button
            type="button"
            size="lg"
            disabled={!reason.trim()}
            onClick={() => onContinue(reason.trim())}
            className="hover:bg-primary/90 active:scale-[0.98] active:bg-primary/80"
          >
            Continue
          </Button>
        </div>
      </div>
    </main>
  );
}

// ── Intake question input area ────────────────────────────────

function OptionButtons({
  content,
  selectedIds,
  isMulti,
  isPending,
  onToggle,
}: {
  content: IntakeContent;
  selectedIds: number[];
  isMulti: boolean;
  isPending: boolean;
  onToggle: (id: number, deselectOthers?: boolean) => void;
}) {
  const options = content.options ?? [];
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id, option.deselectOtherAnswers)}
            disabled={isPending}
            className={cn("intake-option", isSelected && "intake-option-selected")}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
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
  );
}

function FreeTextInput({
  value,
  inputRequired,
  isPending,
  onChange,
}: {
  value: string;
  inputRequired: boolean;
  isPending: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="relative cursor-text rounded-xl border border-white/60 bg-white/30 p-4 transition-colors focus-within:border-primary/40 focus-within:bg-white/50"
      onClick={(e) => (e.currentTarget.querySelector("textarea") as HTMLTextAreaElement)?.focus()}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending}
        placeholder={inputRequired ? "Type your answer…" : "Type your answer (optional)…"}
        className="min-h-[100px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-foreground/35 focus:outline-none"
      />
    </div>
  );
}

function NumberInput({
  value,
  units,
  selectedUnit,
  isPending,
  onValueChange,
  onUnitChange,
}: {
  value: string;
  units?: string[];
  selectedUnit: string;
  isPending: boolean;
  onValueChange: (v: string) => void;
  onUnitChange: (u: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onValueChange(e.target.value.replace(/-/g, ""))}
        disabled={isPending}
        placeholder="Enter a number"
        className="w-full rounded-xl border border-white/60 bg-white/30 px-4 py-3 text-[15px] text-foreground placeholder:text-foreground/35 focus:border-primary/40 focus:bg-white/50 focus:outline-none"
      />
      {units && units.length > 0 && (
        <select
          value={selectedUnit}
          onChange={(e) => onUnitChange(e.target.value)}
          disabled={isPending}
          className="rounded-xl border border-white/60 bg-white/30 px-4 py-3 text-[15px] text-foreground focus:border-primary/40 focus:bg-white/50 focus:outline-none sm:w-40"
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function FirstHxIntakeScreen({ greetingName, initialState, initError }: Props) {
  const [step, setStep] = useState<Step>("reason");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [answerLog, setAnswerLog] = useState<LoggedAnswer[]>([]);
  const [state, setState] = useState<IntakeState | null>(initialState);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [error, setError] = useState<string | null>(initError);
  const [isPending, startTransition] = useTransition();

  const content = state?.content;
  const isCompleted = state?.intakeStatus === "completed";

  // Reset per-question input state whenever the question changes
  function resetInputs() {
    setSelectedIds([]);
    setTextValue("");
    setNumberValue("");
  }

  function toggleOption(optionId: number, deselectOthers?: boolean) {
    if (!content) return;
    if (isMultiSelectType(content.type)) {
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

  function buildAnswer(): AnswerData | null {
    if (!content) return null;
    const type = content.type;
    if (type === "text") return { kind: "options", options: [] };
    if (isFreeTextType(type)) return { kind: "text", text: textValue };
    if (isNumberType(type)) {
      const n = Number(numberValue);
      if (Number.isNaN(n)) return null;
      return { kind: "number", number: n, unit: selectedUnit };
    }
    return { kind: "options", options: buildOptionsAnswer(content, selectedIds) };
  }

  function handleSubmit() {
    if (!state || !content || isPending) return;
    const answer = buildAnswer();
    if (!answer) return;
    setError(null);
    startTransition(async () => {
      try {
        const title = content.title?.trim() || "Question";
        const detail = formatAnswerForLog(content, answer);
        const next = await submitAnswer(state.mkey, content.id, answer);
        setAnswerLog((prev) => [...prev, { title, detail }]);
        setState(next);
        resetInputs();
        // Initialise unit selector from new question if needed
        if (next.content?.units?.[0]) setSelectedUnit(next.content.units[0]);
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
        const prev = await goBack(state.mkey, content.id);
        setAnswerLog((log) => (log.length > 0 ? log.slice(0, -1) : log));
        setState(prev);
        resetInputs();
        if (prev.content?.units?.[0]) setSelectedUnit(prev.content.units[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to go back");
      }
    });
  }

  if (step === "reason") {
    return (
      <ReasonScreen
        greetingName={greetingName}
        onContinue={(reason) => {
          setReasonForVisit(reason);
          setStep("questions");
        }}
      />
    );
  }

  const canSubmit = content
    ? canSubmitForType(content, selectedIds, textValue, numberValue)
    : false;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-8 sm:px-6 lg:py-12">
      <PageHeader greetingName={greetingName} />

      {error ? (
        <div className="intake-glass flex items-start gap-3 rounded-2xl p-5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : isCompleted ? (
        <div className="intake-glass flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
            <CheckCircle2 className="mx-auto size-10 shrink-0 text-primary sm:mx-0" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground">Assessment Complete</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {reasonForVisit || answerLog.length > 0
                  ? "Thank you for completing the intake assessment. Here is what you shared with us."
                  : "Thank you for completing the intake assessment."}
              </p>
            </div>
          </div>

          {(reasonForVisit || answerLog.length > 0) && (
            <div className="space-y-5 border-t border-black/8 pt-6 text-left">
              {reasonForVisit ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    What&apos;s going on today
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {reasonForVisit}
                  </p>
                </section>
              ) : null}
              {answerLog.length > 0 ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your responses
                  </h3>
                  <ul className="mt-3 space-y-4">
                    {answerLog.map((entry, i) => (
                      <li key={`${entry.title}-${i}`}>
                        <p className="text-[13px] font-medium text-foreground/90">{entry.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {entry.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}

          <PostIntakeAccountPrompt />
        </div>
      ) : content ? (
        <div className="intake-glass flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
          {/* Question title */}
          <div className="space-y-1.5">
            {content.title && (
              <h2 className="text-[17px] font-semibold leading-snug text-foreground">
                {content.title}
              </h2>
            )}
            {content.helperText && (
              <p className="text-sm text-muted-foreground">{content.helperText}</p>
            )}
            {isMultiSelectType(content.type) && (
              <p className="text-xs text-muted-foreground/70">Select all that apply</p>
            )}
          </div>

          {/* Optional HTML body (text / consent types) */}
          {content.html && (
            <div
              className="prose prose-sm max-w-none text-foreground"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted HTML from FirstHx API
              dangerouslySetInnerHTML={{ __html: content.html }}
            />
          )}

          {/* Input area — rendered by question type */}
          {isSelectType(content.type) && (
            <OptionButtons
              content={content}
              selectedIds={selectedIds}
              isMulti={isMultiSelectType(content.type)}
              isPending={isPending}
              onToggle={toggleOption}
            />
          )}

          {isFreeTextType(content.type) && (
            <FreeTextInput
              value={textValue}
              inputRequired={content.inputRequired}
              isPending={isPending}
              onChange={setTextValue}
            />
          )}

          {isNumberType(content.type) && (
            <NumberInput
              value={numberValue}
              units={content.units}
              selectedUnit={selectedUnit}
              isPending={isPending}
              onValueChange={setNumberValue}
              onUnitChange={setSelectedUnit}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-1">
            {content.backAllowed && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleBack}
                disabled={isPending}
                className="border-white/60 bg-white/50 backdrop-blur-sm hover:border-primary/30 hover:bg-white/70 active:scale-[0.98]"
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
