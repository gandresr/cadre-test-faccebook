---
description: Fetch the canonical doc / llms.txt for a stack topic. Usage `/docs <nextjs|firestore|auth0|terraform>`.
argument-hint: <nextjs|firestore|auth0|terraform>
---

Fetch the official documentation for the given topic. **Always do this before generating non-trivial code in that stack** — APIs drift faster than memory.

Topic: `$ARGUMENTS`

Resolve `$ARGUMENTS` to one of the following URL sets and `WebFetch` each:

- `nextjs` →
  - https://nextjs.org/docs/llms.txt
  - https://nextjs.org/docs/app/api-reference/file-conventions/route
  - https://nextjs.org/docs/app/api-reference/functions/server-actions

- `firestore` →
  - https://firebase.google.com/docs/firestore/manage-data/structure-data
  - https://firebase.google.com/docs/firestore/query-data/queries
  - https://firebase.google.com/docs/firestore/query-data/indexing

- `auth0` →
  - https://github.com/auth0/nextjs-auth0
  - https://auth0.com/docs/quickstart/webapp/nextjs

- `terraform` →
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_database

If `$ARGUMENTS` is not one of the four, list valid options and stop.

After fetching, summarize the *changes from your prior knowledge* in 3 bullets max. Do not paraphrase the whole doc; the user can read it themselves.
