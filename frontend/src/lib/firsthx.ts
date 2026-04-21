export type IntakeOption = {
  id: number;
  displayText: string;
  originalText: string;
  deselectOtherAnswers?: boolean;
  helperText?: string;
};

export type IntakeContent = {
  id: number;
  options?: IntakeOption[];
  type: string;
  helperText: string;
  backAllowed: boolean;
  title: string;
  inputRequired: boolean;
  html?: string;
  units?: string[];
  feedback?: { starRating: boolean; text: boolean };
};

export type IntakeState = {
  mkey: string;
  intakeStatus: "inProgress" | "completed";
  content?: IntakeContent;
};

// ── Normalisation helpers ─────────────────────────────────────
// The FirstHx API can vary field names across plan configurations.
// All intake responses are run through these helpers before being
// returned to the component so the UI always receives a consistent shape.

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function coalesceString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  }
  return "";
}

function coalesceNumber(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function coalesceBool(...vals: unknown[]): boolean {
  for (const v of vals) {
    if (typeof v === "boolean") return v;
  }
  return false;
}

function coalesceStringArr(...vals: unknown[]): string[] | undefined {
  for (const v of vals) {
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  }
  return undefined;
}

function pickOptionSource(c: Record<string, unknown>): unknown[] {
  const keys = [
    "options", "Options",
    "answers", "Answers",
    "possibleAnswers", "PossibleAnswers",
    "answerOptions", "AnswerOptions",
    "choices", "Choices",
    "selectOptions", "SelectOptions",
    "items", "Items",
  ];
  for (const k of keys) {
    const v = c[k];
    if (Array.isArray(v) && v.length > 0) return v;
  }
  for (const k of keys) {
    const v = c[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function coerceIntakeOption(raw: unknown, index: number): IntakeOption | null {
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    return { id: index, displayText: t, originalText: t };
  }
  const o = asRecord(raw);
  if (!o) return null;
  const id =
    coalesceNumber(o.id, o.Id, o.answerId, o.AnswerId, o.optionId, o.OptionId) ?? index;
  const displayText = coalesceString(
    o.displayText, o.DisplayText,
    o.text, o.Text,
    o.label, o.Label,
    o.title, o.Title,
    o.name, o.Name,
    o.value, o.Value,
  );
  if (!displayText) return null;
  const originalText =
    coalesceString(o.originalText, o.OriginalText, o.text, o.Text) || displayText;
  const helperText = coalesceString(
    o.helperText, o.HelperText, o.description, o.Description,
  );
  const deselectOtherAnswers =
    typeof o.deselectOtherAnswers === "boolean"
      ? o.deselectOtherAnswers
      : typeof o.DeselectOtherAnswers === "boolean"
        ? o.DeselectOtherAnswers
        : undefined;
  return {
    id,
    displayText,
    originalText,
    helperText: helperText || undefined,
    deselectOtherAnswers,
  };
}

function normalizeIntakeContent(raw: unknown): IntakeContent | undefined {
  const c = asRecord(raw);
  if (!c) return undefined;

  let source = pickOptionSource(c);
  if (source.length === 0) {
    const nested = asRecord(
      c.content ?? c.Content ?? c.question ?? c.Question ?? c.data ?? c.Data,
    );
    if (nested) source = pickOptionSource(nested);
  }

  const options: IntakeOption[] = [];
  for (let i = 0; i < source.length; i++) {
    const opt = coerceIntakeOption(source[i], i);
    if (opt) options.push(opt);
  }

  const feedbackRaw = asRecord(c.feedback ?? c.Feedback);
  const feedback = feedbackRaw
    ? {
        starRating: coalesceBool(feedbackRaw.starRating, feedbackRaw.StarRating),
        text: coalesceBool(feedbackRaw.text, feedbackRaw.Text),
      }
    : undefined;

  return {
    id: coalesceNumber(c.id, c.Id) ?? 0,
    options,
    type: coalesceString(c.type, c.Type) || "unknown",
    helperText: coalesceString(c.helperText, c.HelperText, c.subtitle, c.Subtitle),
    backAllowed: coalesceBool(c.backAllowed, c.BackAllowed),
    title: coalesceString(c.title, c.Title, c.question, c.Question, c.prompt, c.Prompt),
    inputRequired: coalesceBool(c.inputRequired, c.InputRequired, c.required, c.Required),
    html: coalesceString(c.html, c.Html, c.htmlContent, c.HtmlContent) || undefined,
    units: coalesceStringArr(c.units, c.Units),
    feedback,
  };
}

function normalizeIntakeState(raw: unknown): IntakeState {
  const s = asRecord(raw);
  if (!s) throw new Error("Invalid intake response");

  const mkey = coalesceString(s.mkey, s.Mkey, s.sessionKey, s.SessionKey);
  if (!mkey) throw new Error("Invalid intake response: missing session key");

  const statusRaw = coalesceString(
    s.intakeStatus, s.IntakeStatus, s.status, s.Status,
  );
  const intakeStatus: "inProgress" | "completed" =
    statusRaw.toLowerCase() === "completed" ? "completed" : "inProgress";

  const contentRaw =
    s.content ?? s.Content ?? s.question ?? s.Question ??
    s.currentQuestion ?? s.CurrentQuestion;

  return {
    mkey,
    intakeStatus,
    content: contentRaw !== undefined ? normalizeIntakeContent(contentRaw) : undefined,
  };
}

// ── Config ────────────────────────────────────────────────────

function getConfig() {
  const baseUrl = process.env.FIRSTHX_INTAKE_BASE_URL;
  const siteId = process.env.FIRSTHX_INTAKE_SITE_ID;
  const username = process.env.FIRSTHX_INTAKE_USERNAME;
  const password = process.env.FIRSTHX_INTAKE_PASSWORD;
  const planId = process.env.FIRSTHX_INTAKE_PLAN_ID;
  if (!baseUrl || !siteId || !username || !password || !planId) {
    throw new Error(
      "FirstHx is not configured. Check FIRSTHX_INTAKE_* environment variables.",
    );
  }
  return { baseUrl, siteId, username, password, planId };
}

// ── API functions ─────────────────────────────────────────────

export async function startIntake(userId: string): Promise<IntakeState> {
  const { baseUrl, siteId, username, password, planId } = getConfig();

  const createRes = await fetch(`${baseUrl}/private/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    },
    body: JSON.stringify({
      intakePlanId: planId,
      siteId,
      identifiableData: {
        intakeId: crypto.randomUUID(),
        patientId: userId,
        patientLanguage: "en",
        patientSex: "M",
        dateOfBirth: "2000-01-01",
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create FirstHx intake session: ${createRes.statusText}`);
  }

  const { mkey } = (await createRes.json()) as { mkey: string };
  return fetchQuestion(mkey);
}

export async function fetchQuestion(mkey: string): Promise<IntakeState> {
  const { baseUrl } = getConfig();

  const res = await fetch(`${baseUrl}/public/${mkey}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch intake question: ${res.statusText}`);
  }

  return normalizeIntakeState(await res.json());
}

export async function answerQuestion(
  mkey: string,
  contentId: number,
  data: Record<string, unknown>,
): Promise<IntakeState> {
  const { baseUrl } = getConfig();

  const res = await fetch(`${baseUrl}/public/${mkey}/answer`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId, data }),
  });

  if (!res.ok) {
    throw new Error(`Failed to submit intake answer: ${res.statusText}`);
  }

  return normalizeIntakeState(await res.json());
}

export async function backQuestion(mkey: string, questionNumber: number): Promise<IntakeState> {
  const { baseUrl } = getConfig();

  const res = await fetch(`${baseUrl}/public/${mkey}/back`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionNumber }),
  });

  if (!res.ok) {
    throw new Error(`Failed to go back to previous question: ${res.statusText}`);
  }

  return normalizeIntakeState(await res.json());
}
