import "server-only";
import { Storage, type StorageOptions } from "@google-cloud/storage";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

// Local dev: ADC via `gcloud auth application-default login`. For signed URLs
// to work locally your ADC identity needs `roles/iam.serviceAccountTokenCreator`
// on the impersonated SA, or re-run login with
// `--impersonate-service-account=<vercel-vertex SA email>`.
//
// Vercel prod: same WIF flow Vertex uses — OIDC token exchanged for an
// access token impersonating the SA, which then calls iamcredentials.signBlob
// to sign URLs without ever handling an SA key.
let cached: Storage | undefined;

export function getStorageClient(): Storage {
  if (cached) return cached;
  const onVercel = process.env.VERCEL === "1";
  if (!onVercel) {
    cached = new Storage();
    return cached;
  }

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

  // `@google-cloud/storage` bundles its own copy of `google-auth-library`, so
  // the `AuthClient` shape from the top-level package doesn't match nominally
  // even though it's identical at runtime. Cast via unknown to sidestep.
  cached = new Storage({ authClient } as unknown as StorageOptions);
  return cached;
}

export function getDocumentsBucket(): string {
  const bucket = process.env.GCP_DOCUMENTS_BUCKET;
  if (!bucket) {
    throw new Error(
      "GCP_DOCUMENTS_BUCKET is not set. Set it to the bucket name from `terraform output documents_bucket_name`.",
    );
  }
  return bucket;
}
