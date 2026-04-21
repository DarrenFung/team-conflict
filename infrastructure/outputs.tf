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

output "app_user_name" {
  description = "Postgres username the Next.js app connects as."
  value       = google_sql_user.app.name
}

output "app_user_password_secret_name" {
  description = "Secret Manager secret holding the app user's password. Retrieve with: gcloud secrets versions access latest --secret=<this>"
  value       = google_secret_manager_secret.app_user_password.secret_id
}

output "admin_password_secret_name" {
  description = "Secret Manager secret holding the built-in postgres user's password. Retrieve with: gcloud secrets versions access latest --secret=<this>"
  value       = google_secret_manager_secret.postgres_admin.secret_id
}
