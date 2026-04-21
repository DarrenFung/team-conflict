variable "project_id" {
  description = "The GCP project that owns the Workload Identity Pool and impersonated service account."
  type        = string
}

variable "region" {
  description = "Default GCP region. WIF itself is global; this is just the provider default."
  type        = string
  default     = "us-central1"
}

# =============================================================================
# Vercel Workload Identity Federation
# =============================================================================

variable "vercel_team_slug" {
  description = "Vercel team slug (from your Vercel team URL). Used in the OIDC issuer URI and token audience."
  type        = string
}

variable "vercel_project_name" {
  description = "Name of the Vercel project allowed to federate. Taken from Vercel project settings; appears in the OIDC `project` claim."
  type        = string
}

variable "vercel_environments" {
  description = "Vercel environments allowed to federate. Options: production, preview, development."
  type        = list(string)
  default     = ["production"]
}

variable "vercel_pool_id" {
  description = "Workload Identity Pool ID for Vercel."
  type        = string
  default     = "vercel-pool"
}

variable "vercel_provider_id" {
  description = "Workload Identity Pool Provider ID for Vercel OIDC."
  type        = string
  default     = "vercel-oidc"
}

variable "vercel_service_account_id" {
  description = "Service account ID impersonated by Vercel deployments."
  type        = string
  default     = "vercel-vertex"
}

# =============================================================================
# Document storage
# =============================================================================

variable "documents_bucket_cors_origins" {
  description = "Origins allowed to upload/download via signed URLs. Tighten to exact Vercel URLs in production."
  type        = list(string)
  default     = ["*"]
}
