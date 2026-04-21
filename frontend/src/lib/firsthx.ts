export type IntakeOption = {
  id: number;
  displayText: string;
  originalText: string;
  deselectOtherAnswers?: boolean;
  helperText?: string;
};

export type IntakeContent = {
  id: number;
  options: IntakeOption[];
  type: string;
  helperText: string;
  backAllowed: boolean;
  title: string;
  inputRequired: boolean;
};

export type IntakeState = {
  mkey: string;
  intakeStatus: "inProgress" | "completed";
  content?: IntakeContent;
};

function getConfig() {
  const baseUrl = process.env.FIRSTHX_INTAKE_BASE_URL;
  const siteId = process.env.FIRSTHX_INTAKE_SITE_ID;
  const username = process.env.FIRSTHX_INTAKE_USERNAME;
  const password = process.env.FIRSTHX_INTAKE_PASSWORD;
  const planId = process.env.FIRSTHX_INTAKE_PLAN_ID;
  if (!baseUrl || !siteId || !username || !password || !planId) {
    throw new Error("FirstHx is not configured. Check FIRSTHX_INTAKE_* environment variables.");
  }
  return { baseUrl, siteId, username, password, planId };
}

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

  return res.json() as Promise<IntakeState>;
}

export async function answerQuestion(
  mkey: string,
  contentId: number,
  options: Pick<IntakeOption, "id" | "displayText" | "originalText">[],
): Promise<IntakeState> {
  const { baseUrl } = getConfig();

  const res = await fetch(`${baseUrl}/public/${mkey}/answer`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId, data: { options } }),
  });

  if (!res.ok) {
    throw new Error(`Failed to submit intake answer: ${res.statusText}`);
  }

  return res.json() as Promise<IntakeState>;
}

export async function backQuestion(mkey: string): Promise<IntakeState> {
  const { baseUrl } = getConfig();

  const res = await fetch(`${baseUrl}/public/${mkey}/back`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to go back to previous question: ${res.statusText}`);
  }

  return res.json() as Promise<IntakeState>;
}
