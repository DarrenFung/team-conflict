# =============================================================================
# Attachment storage — GCS bucket for files uploaded during an intake.
#
# Objects are written/read by the same `vercel_vertex` service account that
# Vercel impersonates via WIF, so no extra auth plumbing is needed on the app
# side. After apply, set this in the Vercel project's env vars:
#   GCP_ATTACHMENTS_BUCKET — output attachments_bucket_name
#
# NOTE: the literal bucket name is still `${var.project_id}-documents`. Renaming
# the GCS bucket would force-destroy and recreate it. Leaving it untouched so
# state and any uploaded test files are preserved.
# =============================================================================

resource "google_project_service" "storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_storage_bucket" "attachments" {
  name     = "${var.project_id}-documents"
  location = var.region

  # Best-practice bucket hardening for anything containing PHI-ish data.
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Browsers PUT/GET objects directly via signed URLs, so the bucket must
  # allow the Vercel deployment origin via CORS. The signed URL carries auth;
  # the CORS policy just controls which browser origin can complete the call.
  cors {
    origin          = var.attachments_bucket_cors_origins
    method          = ["GET", "PUT"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.storage]
}

# Preserve state for anyone who applied the previous `documents` labels.
moved {
  from = google_storage_bucket.documents
  to   = google_storage_bucket.attachments
}

# Vercel-impersonated SA gets read/write on objects in this bucket (not on the
# bucket itself — no admin rights). `objectUser` bundles get/list/create/
# update/delete of objects.
resource "google_storage_bucket_iam_member" "vercel_attachments_rw" {
  bucket = google_storage_bucket.attachments.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.vercel_vertex.email}"
}

moved {
  from = google_storage_bucket_iam_member.vercel_documents_rw
  to   = google_storage_bucket_iam_member.vercel_attachments_rw
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
