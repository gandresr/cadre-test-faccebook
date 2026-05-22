---
name: terraform-gcp
description: Use when writing Terraform for GCP — Cloud Run, Firestore, IAM, Secret Manager, Artifact Registry, GCS state buckets. Mirrors the conventions in `infra-bootstrap-foundations-gcp`. Triggers on mentions of Terraform, GCP, Cloud Run, Firestore IAM, gcs backend, deploy, infra/.
---

# Terraform for GCP — cadre-test stretch deployment

**Stretch goal only.** Do not start until the MVP is green in the browser.

## Step 1 — Fetch the Terraform Google provider docs

```
WebFetch url=https://registry.terraform.io/providers/hashicorp/google/latest/docs
```

For specific resources, fetch the focused doc:
- Cloud Run v2: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Firestore database: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_database
- Secret Manager: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret
- IAM bindings: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam

## Step 2 — Read the reference modules

Before writing anything, read at least:
- [infra-bootstrap-foundations-gcp/modules/cloud_run_small/main.tf](../../../../infra-bootstrap-foundations-gcp/modules/cloud_run_small/main.tf) — the cloud_run pattern we mirror.
- [infra-bootstrap-foundations-gcp/naming-convention.md](../../../../infra-bootstrap-foundations-gcp/naming-convention.md) — naming rules.
- [infra-bootstrap-foundations-gcp/environments/development/portal/terragrunt.hcl](../../../../infra-bootstrap-foundations-gcp/environments/development/portal/terragrunt.hcl) — how state buckets are wired.

## Step 3 — Naming convention

```
${prefix}-${project_slug_short}-${resource_type}-${hash6}-${region_no_dashes}-${env}
```

Example: `sim-cadre-cr-a1b2c3-uscentral1-dev`. Keep names ≤ 46 chars total to satisfy Cloud Run tag+name limits.

## Step 4 — Layout for cadre-test

```
infra/terraform/
  provider.tf          # google provider + GCS backend
  variables.tf         # prefix, project_id, region, env, auth0 secret refs
  main.tf              # wires the modules
  outputs.tf           # cloud_run_url
  modules/
    cloud_run/
      main.tf          # google_cloud_run_v2_service + SA + secret bindings
      variables.tf
      outputs.tf
    firestore_iam/
      main.tf          # google_project_iam_member for roles/datastore.user
      variables.tf
```

## Step 5 — Backend config

```hcl
# provider.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    google = { source = "hashicorp/google", version = ">= 7.0.0" }
  }
  backend "gcs" {
    bucket = "your-prefix-terraform-state-YOUR_ORG_ID"
    prefix = "cadre-test/terraform.tfstate"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

## Step 6 — Cloud Run service (key bits)

```hcl
resource "google_cloud_run_v2_service" "app" {
  name     = local.service_name
  project  = var.project_id
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # MUST be false or destroys / replaces will fail (lesson from portal).
  deletion_protection = false

  template {
    service_account = google_service_account.app.email

    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/cadre/cadre-test:latest"
      ports { container_port = 3000 }

      env { name = "AUTH0_DOMAIN"        value = var.auth0_domain }
      env { name = "AUTH0_CLIENT_ID"     value = var.auth0_client_id }
      env { name = "APP_BASE_URL"        value = "https://${local.service_name}-uc.a.run.app" }
      env {
        name = "AUTH0_CLIENT_SECRET"
        value_source { secret_key_ref { secret = google_secret_manager_secret.auth0_client_secret.secret_id, version = "latest" } }
      }
      env {
        name = "AUTH0_SECRET"
        value_source { secret_key_ref { secret = google_secret_manager_secret.auth0_secret.secret_id, version = "latest" } }
      }
    }
  }

  # CI/CD owns the image; Terraform owns config.
  lifecycle {
    create_before_destroy = true
    ignore_changes = [
      template[0].containers[0].image,
      traffic,
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

## Step 7 — Firestore IAM

```hcl
resource "google_service_account" "app" {
  account_id   = "cadre-app"
  display_name = "Cadre Test App SA"
  project      = var.project_id
}

resource "google_project_iam_member" "firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.app.email}"
}
```

## Step 8 — Workflow

```bash
cd infra/terraform
terraform fmt -recursive
terraform validate
terraform init
terraform plan
# Manual review of the plan, then:
terraform apply   # NOT permitted by .claude/settings.json without explicit user override
```

## Common pitfalls

- **Missing `deletion_protection = false`** — destroy hangs forever.
- **Not pinning `ignore_changes` on `image` and `traffic`** — Terraform fights CI on every deploy.
- **GCS state bucket doesn't exist yet** — `terraform init` fails. Bootstrap the bucket out-of-band (mirror what `deploy-init.sh` does in `infra-bootstrap-foundations-gcp`).
- **Storing secret VALUES in tfvars** — leaks into state. Only store secret NAMES; values go straight into Secret Manager.
- **Wrong region in service URL** — Auth0 callback URL must match the actual Cloud Run URL.
