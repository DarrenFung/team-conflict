# =============================================================================
# Vercel → GCP Workload Identity Federation
#
# Lets Vercel deployments call GCP APIs (Vertex AI, etc.) using short-lived
# credentials exchanged from Vercel OIDC tokens. No service account keys are
# created — required because this project's org policy enforces
# `constraints/iam.managed.disableServiceAccountKeyCreation`.
#
# Prerequisite (one-time, Vercel UI):
#   Vercel Project → Settings → Security → Secure Backend Access →
#   enable "OIDC Federation". Then fill in vercel_team_slug and
#   vercel_project_name in terraform.tfvars.
#
# After apply, set these Vercel env vars (values from outputs):
#   GOOGLE_VERTEX_PROJECT          — var.project_id
#   GOOGLE_VERTEX_LOCATION         — e.g. us-central1
#   GCP_WORKLOAD_IDENTITY_AUDIENCE — output vercel_workload_identity_audience
#   GCP_SERVICE_ACCOUNT_EMAIL      — output vercel_service_account_email
# =============================================================================

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iamcredentials" {
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sts" {
  service            = "sts.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "aiplatform" {
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

# ---------- Service account that Vercel will impersonate --------------------

resource "google_service_account" "vercel_vertex" {
  account_id   = var.vercel_service_account_id
  display_name = "Vercel → Vertex AI"
  description  = "Impersonated by Vercel deployments via Workload Identity Federation."

  depends_on = [google_project_service.iam]
}

resource "google_project_iam_member" "vercel_vertex_aiplatform_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.vercel_vertex.email}"
}

# ---------- Workload Identity Pool + Vercel OIDC provider -------------------

resource "google_iam_workload_identity_pool" "vercel" {
  workload_identity_pool_id = var.vercel_pool_id
  display_name              = "Vercel"
  description               = "Federated identities from Vercel OIDC."

  depends_on = [google_project_service.iam]
}

resource "google_iam_workload_identity_pool_provider" "vercel_oidc" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.vercel.workload_identity_pool_id
  workload_identity_pool_provider_id = var.vercel_provider_id
  display_name                       = "Vercel OIDC"
  description                        = "Trusts OIDC tokens issued by Vercel for team ${var.vercel_team_slug}."

  oidc {
    issuer_uri        = "https://oidc.vercel.com/${var.vercel_team_slug}"
    allowed_audiences = ["https://vercel.com/${var.vercel_team_slug}"]
  }

  attribute_mapping = {
    "google.subject"        = "assertion.sub"
    "attribute.owner"       = "assertion.owner"
    "attribute.project"     = "assertion.project"
    "attribute.environment" = "assertion.environment"
  }

  attribute_condition = join(" && ", [
    "assertion.owner == \"${var.vercel_team_slug}\"",
    "assertion.project == \"${var.vercel_project_name}\"",
    "assertion.environment in [${join(",", [for env in var.vercel_environments : "\"${env}\""])}]"
  ])
}

# ---------- Let federated principals impersonate the SA ---------------------
#
# Scoped to federated identities whose OIDC claim `project` matches the
# configured Vercel project, so other Vercel projects in the same team (if any)
# cannot assume this SA.

resource "google_service_account_iam_member" "vercel_impersonate" {
  service_account_id = google_service_account.vercel_vertex.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.vercel.workload_identity_pool_id}/attribute.project/${var.vercel_project_name}"
}
