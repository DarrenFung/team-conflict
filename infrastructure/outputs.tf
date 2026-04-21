output "instance_connection_name" {
  description = "Full connection name: project:region:instance. Used by @google-cloud/cloud-sql-connector."
  value       = google_sql_database_instance.main.connection_name
}

output "instance_public_ip" {
  description = "Public IP address of the Cloud SQL instance (for local psql testing)."
  value       = google_sql_database_instance.main.public_ip_address
}

output "database_name" {
  description = "Name of the Postgres database."
  value       = google_sql_database.main.name
}

output "app_service_account_email" {
  description = "Email of the service account the app authenticates as. Postgres IAM username is this value with '.gserviceaccount.com' stripped."
  value       = google_service_account.app.email
}

output "app_service_account_postgres_username" {
  description = "Exact username to use when connecting to Postgres as the app SA."
  value       = trimsuffix(google_service_account.app.email, ".gserviceaccount.com")
}

output "app_service_account_key" {
  description = "JSON key for the app service account. Copy into Vercel env var GOOGLE_APPLICATION_CREDENTIALS_JSON, then discard. Rotate via `terraform taint google_service_account_key.app`."
  value       = base64decode(google_service_account_key.app.private_key)
  sensitive   = true
}

output "admin_password_secret_name" {
  description = "Secret Manager secret holding the built-in postgres user's password. Retrieve with: gcloud secrets versions access latest --secret=<this>"
  value       = google_secret_manager_secret.postgres_admin.secret_id
}
