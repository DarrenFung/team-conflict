# =============================================================================
# Document storage — GCS bucket for patient intake uploads.
#
# Objects are written/read by the same `vercel_vertex` service account that
# Vercel impersonates via WIF, so no extra auth plumbing is needed on the app
# side. After apply, set this in the Vercel project's env vars:
#   GCP_DOCUMENTS_BUCKET — output documents_bucket_name
# =============================================================================

resource "google_project_service" "storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_storage_bucket" "documents" {
  name     = "${var.project_id}-documents"
  location = var.region

  # Best-practice bucket hardening for anything containing PHI-ish data.
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Browsers PUT/GET objects directly via signed URLs, so the bucket must
  # allow the Vercel deployment origin via CORS. The signed URL carries auth;
  # the CORS policy just controls which browser origin can complete the call.
  cors {
    origin          = var.documents_bucket_cors_origins
    method          = ["GET", "PUT"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.storage]
}

# Vercel-impersonated SA gets read/write on objects in this bucket (not on the
# bucket itself — no admin rights). `objectUser` bundles get/list/create/
# update/delete of objects.
resource "google_storage_bucket_iam_member" "vercel_documents_rw" {
  bucket = google_storage_bucket.documents.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.vercel_vertex.email}"
}

# V4 signed URLs require the caller to sign the URL via
# `iamcredentials.signBlob`. Under WIF there's no SA key to sign locally, so
# the runtime impersonates itself through IAM Credentials. That self-
# impersonation needs `roles/iam.serviceAccountTokenCreator` on the SA.
resource "google_service_account_iam_member" "vercel_sign_self" {
  service_account_id = google_service_account.vercel_vertex.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.vercel_vertex.email}"
}
