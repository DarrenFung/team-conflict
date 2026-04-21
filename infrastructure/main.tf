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
    edition           = "ENTERPRISE"
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
# App database user (BUILT_IN, password-based auth for Vercel)
#
# Note: the original design used an IAM DB user with a service account key.
# The project's org policy `constraints/iam.managed.disableServiceAccountKeyCreation`
# blocks SA key creation, so the app uses password auth instead. SSL is still
# required by `ssl_mode = "ENCRYPTED_ONLY"` on the instance.
# =============================================================================

resource "random_password" "app_user" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*()-_=+[]{}"
}

resource "google_secret_manager_secret" "app_user_password" {
  secret_id = "team-conflict-app-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "app_user_password" {
  secret      = google_secret_manager_secret.app_user_password.id
  secret_data = random_password.app_user.result
}

resource "google_sql_user" "app" {
  name     = var.app_user_name
  instance = google_sql_database_instance.main.name
  type     = "BUILT_IN"
  password = random_password.app_user.result

  depends_on = [google_sql_database.main]
}
