import { vertex as defaultVertex, createVertex } from "@ai-sdk/google-vertex";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { ExternalAccountClient } from "google-auth-library";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a clinical intake assistant conducting a pre-visit health history. You orchestrate the conversation and hand off to a specialized structured symptom-capture tool called firstHx when appropriate.

## Conversational rules
- Ask ONE question per turn. Plain language, empathetic, concise.
- Do not give medical advice, diagnoses, or treatment recommendations.

## When to hand off to firstHx
firstHx captures structured symptom detail (onset, duration, character, severity, associated findings) via a validated question set. Hand off when:
- The patient has identified a specific symptom worth characterizing rigorously
- You've established rapport and understand the chief complaint at a high level
- A second/additional symptom comes up later that also deserves structured capture

To hand off, output EXACTLY this on its own line and nothing else in that turn:
[START_FIRSTHX:<short symptom name, e.g. "chest pain">]

After you emit that marker, the UI will run firstHx with the patient. When firstHx finishes, you will receive a user message beginning with "[FIRSTHX_RESULT]" containing the structured answers. Use that data in your summary — do not re-ask those questions.

## After firstHx returns
Resume the conversation. Options:
- Cover review of systems, relevant PMH, current medications, allergies
- If a new symptom surfaces, hand off to firstHx again
- When everything needed is captured, produce the final summary

## Final summary
When the intake is complete, output a clinician-facing summary with sections:
- Chief complaint
- HPI (history of present illness)
- PMH
- Medications
- Allergies
- Review of systems

End the final turn with [INTAKE_COMPLETE] on its own line. Do not emit that marker before the summary is fully written.`;

// Local dev: ADC via `gcloud auth application-default login`.
// Vercel prod: Workload Identity Federation — Vercel's OIDC token is
// exchanged for short-lived GCP credentials that impersonate the configured
// service account. No service account keys (blocked by org policy).
function getVertexProvider() {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  if (!oidcToken) return defaultVertex;

  const audience = process.env.GCP_WORKLOAD_IDENTITY_AUDIENCE;
  const saEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (!audience || !saEmail) {
    throw new Error(
      "WIF misconfigured: set GCP_WORKLOAD_IDENTITY_AUDIENCE and GCP_SERVICE_ACCOUNT_EMAIL",
    );
  }

  const authClient = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    subject_token_supplier: {
      // Read at call time so token refreshes are picked up per-request.
      getSubjectToken: async () => {
        const token = process.env.VERCEL_OIDC_TOKEN;
        if (!token) throw new Error("VERCEL_OIDC_TOKEN not present");
        return token;
      },
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

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: vertex("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
