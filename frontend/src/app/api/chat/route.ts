import { vertex as defaultVertex, createVertex } from "@ai-sdk/google-vertex";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";
import { modules } from "@/modules/registry";
import { prisma } from "@/lib/db";
import { getOrCreateActiveUser } from "@/lib/auth";

export const maxDuration = 30;

const COMPLETION_MARKER = "[INTAKE_COMPLETE]";

const SYSTEM_PROMPT = `You are a clinical intake assistant conducting a pre-visit health history. You have access to specialized tools for parts of the intake and orchestrate the conversation around them.

## Available tools
${modules.map((m) => `- ${m.name}: ${m.description}`).join("\n")}

## Conversational rules
- Ask ONE question per turn. Plain language, empathetic, concise.
- Call a tool when it's the right fit. Don't re-ask questions the tool will cover.
- Do not give medical advice, diagnoses, or treatment recommendations.

## After a tool returns
Resume the conversation. Use the tool's output as context — do not re-ask what it already captured. Cover what's still missing (review of systems, relevant PMH, current medications, allergies). Call another tool if useful.

## Final summary
When the intake is complete, output a clinician-facing summary with sections:
- Chief complaint
- HPI (history of present illness)
- PMH
- Medications
- Allergies
- Review of systems

End the final turn with ${COMPLETION_MARKER} on its own line. Do not emit that marker before the summary is fully written.`;

// Local dev: ADC via `gcloud auth application-default login`.
// Vercel prod: Workload Identity Federation — Vercel's OIDC token (from the
// `x-vercel-oidc-token` header in functions, VERCEL_OIDC_TOKEN env var in
// builds/local) is exchanged for short-lived GCP credentials that impersonate
// the configured service account. `@vercel/oidc`'s getVercelOidcToken handles
// both sources transparently.
function getVertexProvider() {
  const onVercel = process.env.VERCEL === "1";
  if (!onVercel) return defaultVertex;

  const audience = process.env.GCP_WORKLOAD_IDENTITY_AUDIENCE;
  const saEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (!audience || !saEmail) {
    throw new Error(
      "WIF misconfigured: set GCP_WORKLOAD_IDENTITY_AUDIENCE and GCP_SERVICE_ACCOUNT_EMAIL in Vercel env vars (values come from `terraform output`).",
    );
  }

  const authClient = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: () => getVercelOidcToken(),
    },
  });

  if (!authClient) {
    throw new Error("Failed to construct ExternalAccountClient for WIF");
  }

  return createVertex({
    googleAuthOptions: { authClient },
  });
}

const vertex = getVertexProvider();

const tools = Object.fromEntries(
  modules.map((m) => [
    m.name,
    tool({
      description: m.description,
      inputSchema: m.argsSchema,
    }),
  ]),
);

export async function POST(req: Request) {
  const {
    messages,
    encounterId,
  }: { messages: UIMessage[]; encounterId?: string } = await req.json();

  if (!encounterId) {
    return new Response("encounterId is required", { status: 400 });
  }

  const user = await getOrCreateActiveUser();

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { userId: true },
  });
  if (!encounter) {
    console.error(
      `[api/chat] encounter ${encounterId} not found (request user ${user.id})`,
    );
    return new Response(`Encounter ${encounterId} not found`, { status: 404 });
  }
  if (encounter.userId !== user.id) {
    console.error(
      `[api/chat] encounter ${encounterId} belongs to ${encounter.userId}, request user is ${user.id}`,
    );
    return new Response("Encounter belongs to a different user", { status: 403 });
  }

  const result = streamText({
    model: vertex("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(20),
  });

  return result.toUIMessageStreamResponse();
}
