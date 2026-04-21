output "vercel_service_account_email" {
  description = "Set as GCP_SERVICE_ACCOUNT_EMAIL in the Vercel project's env vars."
  value       = google_service_account.vercel_vertex.email
}

output "vercel_workload_identity_audience" {
  description = "Set as GCP_WORKLOAD_IDENTITY_AUDIENCE in the Vercel project's env vars."
  value       = "//iam.googleapis.com/${google_iam_workload_identity_pool_provider.vercel_oidc.name}"
}

output "project_number" {
  description = "GCP project number. Useful for building resource strings manually."
  value       = data.google_project.current.number
}

output "documents_bucket_name" {
  description = "Set as GCP_DOCUMENTS_BUCKET in the Vercel project's env vars."
  value       = google_storage_bucket.documents.name
}
