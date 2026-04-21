variable "project_id" {
  description = "The GCP project that will contain the Cloud SQL instance."
  type        = string
}

variable "region" {
  description = "GCP region for the Cloud SQL instance."
  type        = string
  default     = "northamerica-northeast2"
}

variable "instance_name" {
  description = "Cloud SQL instance name."
  type        = string
  default     = "team-conflict-db"
}

variable "database_name" {
  description = "Database name created inside the Cloud SQL instance."
  type        = string
  default     = "team_conflict"
}

variable "tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-g1-small"
}

variable "postgres_version" {
  description = "Cloud SQL Postgres engine version."
  type        = string
  default     = "POSTGRES_17"
}

variable "disk_size_gb" {
  description = "Initial data disk size in GB (auto-grow is enabled)."
  type        = number
  default     = 10
}

variable "deletion_protection" {
  description = "Deletion protection on the Cloud SQL instance. Flip to false only when intentionally tearing down."
  type        = bool
  default     = true
}

variable "app_user_name" {
  description = "Postgres BUILT_IN user name the Next.js app connects as."
  type        = string
  default     = "app"
}
