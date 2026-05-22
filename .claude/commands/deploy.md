---
description: STRETCH GOAL. Build the container image, push to Artifact Registry, terraform apply, smoke-test the public URL. Requires the MVP to be verified locally first.
---

**Pre-flight checks** — refuse to proceed unless ALL of these are true. Print which ones failed:

1. `git status` shows a clean working tree.
2. `npm run lint && npm run typecheck && npm test` all pass.
3. The user has manually verified the MVP loop in a local browser (signup → post → feed). If unsure, ASK them to confirm before proceeding.
4. `infra/terraform/` exists with `main.tf` and `provider.tf`.
5. `gcloud config get-value project` returns a non-empty GCP project ID.

If any pre-flight fails, list which ones and stop.

**Deploy sequence:**

1. **Build + push image**:
   ```bash
   PROJECT_ID=$(gcloud config get-value project)
   IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/cadre/cadre-test:$(git rev-parse --short HEAD)"
   docker build -t "$IMAGE" .
   docker push "$IMAGE"
   ```

2. **Terraform**:
   ```bash
   cd infra/terraform
   terraform fmt -recursive
   terraform validate
   terraform init
   terraform plan -out=tfplan
   ```
   **Show the plan to the user and wait for explicit confirmation** before running `terraform apply tfplan`. Do not auto-apply — the settings file denies it.

3. **Post-apply**:
   - Read `cloud_run_url` from `terraform output`.
   - `curl -fsS "$cloud_run_url/api/health"` — expect a 200 with `{"ok":true}`.
   - Print the deployed URL prominently.

4. **Update Auth0 dashboard reminder**: print a one-liner reminding the user to add the deployed URL to Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins in the Auth0 dashboard. Auth flows will 4xx until they do.

Networking, custom domain, Cloud Armor, and load balancing are explicitly out of scope for this MVP.
