# =============================================================================
# APIs
# =============================================================================

resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "serviceusage" {
  service            = "serviceusage.googleapis.com"
  disable_on_destroy = false
}

# =============================================================================
# Cloud SQL instance
# =============================================================================

resource "google_sql_database_instance" "main" {
  name             = var.instance_name
  database_version = var.postgres_version
  region           = var.region

  deletion_protection = var.deletion_protection

  depends_on = [google_project_service.sqladmin]

  settings {
    tier              = var.tier
    availability_type = "ZONAL"
    disk_size         = var.disk_size_gb
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ENCRYPTED_ONLY"

      authorized_networks {
        name  = "public"
        value = "0.0.0.0/0"
      }
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }
}

# =============================================================================
# Database
# =============================================================================

resource "google_sql_database" "main" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
  charset  = "UTF8"
}

# =============================================================================
# Admin password (random, stored only in Secret Manager)
# =============================================================================

resource "random_password" "postgres_admin" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*()-_=+[]{}"
}

resource "google_secret_manager_secret" "postgres_admin" {
  secret_id = "postgres-admin-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "postgres_admin" {
  secret      = google_secret_manager_secret.postgres_admin.id
  secret_data = random_password.postgres_admin.result
}

# =============================================================================
# Built-in postgres admin user (emergency access + migrations)
# =============================================================================

resource "google_sql_user" "postgres_admin" {
  name     = "postgres"
  instance = google_sql_database_instance.main.name
  type     = "BUILT_IN"
  password = random_password.postgres_admin.result
}

# =============================================================================
# App service account (Vercel authenticates as this SA)
# =============================================================================

resource "google_service_account" "app" {
  account_id   = var.app_service_account_id
  display_name = "Team Conflict App (Vercel)"
  description  = "Used by the Next.js app on Vercel to authenticate to Cloud SQL via IAM DB auth."

  depends_on = [google_project_service.iam]
}

resource "google_project_iam_member" "app_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_cloudsql_instance_user" {
  project = var.project_id
  role    = "roles/cloudsql.instanceUser"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# IAM user inside Postgres — name must be the SA email with ".gserviceaccount.com" stripped
resource "google_sql_user" "app_iam" {
  name     = trimsuffix(google_service_account.app.email, ".gserviceaccount.com")
  instance = google_sql_database_instance.main.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"

  depends_on = [
    google_project_iam_member.app_cloudsql_instance_user,
    google_sql_database.main,
  ]
}

# =============================================================================
# Service account key (surfaced once via `terraform output` for Vercel)
# =============================================================================

resource "google_service_account_key" "app" {
  service_account_id = google_service_account.app.name
}
