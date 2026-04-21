terraform {
  backend "gcs" {
    bucket = "gsv-hack-26-team-conflict-tfstate"
    prefix = "team-conflict/prod"
  }
}
