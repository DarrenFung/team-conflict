import "server-only";
import { vertex as defaultVertex, createVertex } from "@ai-sdk/google-vertex";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

// Local dev: ADC via `gcloud auth application-default login`.
// Vercel prod: Workload Identity Federation — Vercel's OIDC token is exchanged
// for short-lived GCP credentials that impersonate the configured service account.
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

export const vertex = getVertexProvider();
