# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission

Build a minimal social network ("Social Network 1.0", Facebook circa 2004) — signup, profile, status posts, feed. **MVP must ship in under 60 minutes.** Stretch goals (follows, likes, comments) only after the core loop is live and verified in the browser. See [README.md](README.md) for the prompt and [plan.md](plan.md) for the phased build.

Networking and cloud deployment are **out of scope** unless the MVP is shipped and verified with time to spare. Default to local-first; cloud is a stretch.

## Stack (locked — do not substitute)

- **Next.js 16** (App Router, TypeScript, single repo, monolith). Frontend pages + server actions + route handlers all live in `app/`. `proxy.ts` at the repo root (Next 16 replaces `middleware.ts`).
- **Firestore** (Cloud Firestore in Native mode) for chats, posts, user profiles. Server-side via `firebase-admin`; client reads via `firebase` JS SDK only when realtime is needed.
- **Auth0** with Google social connection (must match the pattern in [web-webapp-portal/proxy.ts](../web-webapp-portal/proxy.ts) and [web-webapp-portal/src/lib/auth/](../web-webapp-portal/src/lib/auth)). Use `@auth0/nextjs-auth0` v4+.
- **Terraform** for GCS-backed Cloud Run deployment (stretch goal — only if MVP ships early). Follow module conventions from [infra-bootstrap-foundations-gcp/](../infra-bootstrap-foundations-gcp).
- **Jest + React Testing Library** for unit tests; **Playwright** (or Jest+supertest for API) for integration tests.

If you find yourself reaching for Postgres/Prisma/Supabase/another auth provider, **stop and re-read this section**. Stack drift kills the timeline.

## Architecture — minimal Next.js monolith

One repo. Flat App Router on top, a thin shared lib underneath. No Clean-Architecture layers — this is a 60-min MVP, not a production service. Add layers only when a concrete pain shows up.

```
app/                              # Next.js App Router — flat segments, no route groups
  _components/                    # Shared React components (underscore = not a route)
  api/{health,posts,users}/route.ts
  auth/{login,callback,logout}/route.ts
  feed/page.tsx                   # Authenticated feed
  profile/[uid]/page.tsx          # User profile
  layout.tsx  page.tsx  globals.css  favicon.ico
proxy.ts                          # Auth gate (Next 16; replaces middleware.ts)

src/
  lib/
    auth/                         # Auth0 multi-file module: server-auth.ts, auth0-login.ts, ...
    firestore.ts                  # Admin SDK singleton + typed converters in one file
    posts.ts                      # Posts data access + business logic
    users.ts                      # Users data access + business logic
  types.ts                        # Shared TS types (User, Post, ...)

infra/
  terraform/                      # (stretch) Cloud Run + GCS + Firestore IAM
```

**Rules:**
- **No layered abstractions** until a real second consumer demands one. One file per domain (`posts.ts`, `users.ts`) holds both the Firestore query and the business logic. Refactor *only* when you can name two callers that benefit.
- **Underscore-prefixed folders in `app/`** (`_components`) are private — Next.js skips them when routing. Use `app/_components/` for components reused across routes; co-locate single-use components next to the page that owns them.
- **Data flow:** server component or route handler → `src/lib/{posts,users}.ts` → Firestore Admin SDK. Never call the Admin SDK directly from a React component; always go through `src/lib/`.
- **Tests** co-locate next to source. `foo.ts` ⇄ `foo.test.ts`. Emulator-backed tests use the `.integration.test.ts` suffix and run under the `integration` Jest project.

## Authentication: Auth0 + proxy.ts

Mirror the pattern used in [web-webapp-portal/proxy.ts](../web-webapp-portal/proxy.ts):

1. `proxy.ts` runs on Node (Next 16). It must NOT export a `config` matcher — skip cheap paths (`/_next/static`, `/favicon.ico`, `/api/health`) inline.
2. Public routes: `/`, `/auth/login`, `/auth/signup`, `/auth/callback`, `/auth/logout`, `/api/health`.
3. Authenticated routes (`/feed`, `/profile/*`, `/api/posts/*`, `/api/users/*`): redirect unauth users to `/auth/login?returnTo=<original-path>`.
4. Session retrieval uses `auth0.getSession(request)`; treat decryption errors as unauthenticated (matches portal behavior).
5. Use `sanitizeAuthReturnTo()` for any `returnTo` query param to prevent open redirects.
6. Google social connection slug: `google-oauth2` (Auth0 default).

Required env vars (`.env.local`):
```
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=...                 # openssl rand -hex 32
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE=google-oauth2
GOOGLE_APPLICATION_CREDENTIALS=./gcp-firestore-sa.json
FIRESTORE_PROJECT_ID=...
```

**Optimistic redirect, server-side recheck:** `proxy.ts` does best-effort gating. Every protected page/route handler must independently verify the session via `auth0.getSession()` before reading or writing data. The DAL (data-access layer in `src/lib/`) is the authority.

## Firestore Data Model

See [`docs/data-model.md`](docs/data-model.md) for the full 2004-faithful schema (users, friendships, wall posts, pokes, conversations, groups).

MVP scope is P0 collections only.

## Commands

```bash
# Setup
npm install
cp .env.example .env.local       # then fill in Auth0 + Firestore creds

# Dev
npm run dev                       # next dev on :3000

# Build / start (production-like)
npm run build
npm start

# Lint / typecheck
npm run lint
npm run typecheck                 # tsc --noEmit

# Tests
npm test                          # all unit + integration
npm test -- path/to/file.test.ts  # single test file
npm test -- -t "test name"        # single test by name
npm run test:integration          # integration suite only
npm run test:watch                # watch mode

# Terraform (stretch goal only)
cd infra/terraform
terraform init && terraform plan && terraform apply
```

## Doc Sources — Consult Before Generating Stack-Specific Code

When generating code that touches the stack, fetch the relevant llms.txt / official docs first using `WebFetch`. Do not rely on memory; APIs change. The skills in `.claude/skills/` and the subagents in `.claude/agents/` embed the canonical URLs.

- **Next.js 16 (App Router, proxy.ts, server actions)**: https://nextjs.org/docs/llms.txt
- **Firestore (Admin SDK + Web SDK + security rules)**: https://cloud.google.com/firestore/docs and https://firebase.google.com/docs/firestore
- **Auth0 Next.js SDK v4**: https://github.com/auth0/nextjs-auth0 and https://auth0.com/docs/quickstart/webapp/nextjs
- **Terraform GCP provider**: https://registry.terraform.io/providers/hashicorp/google/latest/docs

## Subagents — When to Delegate

Use the Agent tool with these subagent types when the task fits. Run independent ones in parallel.

| Agent | Use when |
|---|---|
| `frontend` | Building React components, pages, layouts, client-side forms, styling. |
| `backend` | Route handlers, server actions, business logic in `src/lib/`. |
| `data-storage` | Firestore schema, queries, converters, indexes, security rules. |
| `auth0` | Anything touching `proxy.ts`, session retrieval, login/callback wiring. |
| `infra-terraform` | Terraform modules, GCS state, Cloud Run + Firestore IAM. **Stretch only.** |
| `testing` | Writing unit/integration tests, debugging test failures. |
| `cleaner` | Hunt and delete stale code, unused exports/files/deps, malfunctioning React state, ambiguous patterns. Run after a feature lands or before committing a batch. |

Subagent definitions live in `.claude/agents/`. Each one has scoped tool access and an embedded doc URL it must consult.

## Skills

Domain-specific knowledge with progressive disclosure, in `.claude/skills/`:

- `nextjs-app-router` — App Router conventions, server vs client components, `proxy.ts` (not middleware.ts in Next 16).
- `firestore-data-modeling` — Collection design, denormalization rules, index gotchas, Admin vs Web SDK boundaries.
- `auth0-nextjs` — Auth0Client setup, session helpers, the proxy.ts gating pattern, Google connection slug.
- `terraform-gcp` — Module layout that mirrors `infra-bootstrap-foundations-gcp`, naming conventions, state in GCS.
- `testing-strategy` — Where to draw the unit vs integration line for this stack; Firestore emulator setup.

## Slash Commands

In `.claude/commands/`:

- `/scaffold` — Bootstrap the Next.js + Auth0 + Firestore project skeleton.
- `/docs <topic>` — WebFetch the canonical doc for `nextjs`, `firestore`, `auth0`, or `terraform`.
- `/verify` — Run lint + typecheck + tests in parallel; report only failures.
- `/test-all` — Same as `/verify` but include the integration suite.
- `/deploy` — Stretch goal: `terraform apply` and smoke-test the deployed URL.

## Engineering Rules (non-negotiable)

These rules override defaults. They apply to every subagent, every skill, every command.

### No backwards compatibility

Rename, delete, and reshape freely. Do not keep deprecated aliases, shim re-exports, `// removed` placeholder comments, or `_legacy` parameters. If a thing is replaced, delete the old thing in the same change. Migration files, dual-write code paths, and "old behavior preserved when flag is off" branches are forbidden unless the user explicitly asks for them.

### No fallbacks or silent defaults

Missing config, missing env var, missing file, schema mismatch, malformed input, unexpected response shape — **raise immediately** with a clear, specific error message. Do not coerce types. Do not guess. Do not "try the other path." Do not substitute a default value to keep things running. The only exception is when the user explicitly specifies a fallback in the prompt.

Examples of patterns to **reject**:
- `process.env.X ?? "some-default"` for anything that must be set in production.
- `try { primary() } catch { secondary() }` to mask which path actually failed.
- `if (!schema.parse(input)) return null` — return the parse error, do not swallow it.
- `value || "fallback"` where `value` is required.

### No feature flags or gradual rollouts

Unless the prompt explicitly asks for one, do not introduce feature flags, env-var-gated branches, percentage rollouts, A/B switches, or "if NEW_BEHAVIOR is enabled" blocks. Just change the code. Old code goes away in the same commit.

### Errors must be specific and actionable

Every thrown error and every JSON error response must answer: **what failed, with what input, and what the user/caller should do next**. Generic `500` or `400` clusters make debugging slow and downgrade the demo. Apply this on both the backend and the frontend.

Backend route handlers — return distinct, descriptive `error` strings and use the *right* status code:

| Status | When | Example `error` string |
|---|---|---|
| 400 | Schema validation fails | `"Post text must be 1–500 characters; got 0"` |
| 401 | No session / expired session | `"Auth0 session missing; sign in at /auth/login"` |
| 403 | Session present but not authorized | `"User auth0_xxx is not the author of post abc; cannot delete"` |
| 404 | Resource doesn't exist | `"Post abc not found"` |
| 409 | Conflict / duplicate | `"User auth0_xxx already follows auth0_yyy"` |
| 422 | Valid shape but business rule violated | `"Post text contains banned word: 'xxx'"` |
| 500 | Genuine internal error | `"Firestore write failed: <underlying message>; check service account roles/datastore.user"` |

Frontend — when surfacing an error to the user, **show the specific reason returned by the API**, not a generic toast. When logging to the console, include the operation, the inputs (redacted as needed), and the underlying message. Never `catch (e) {}`. Never `catch (e) { console.error(e) }` with no context — always prefix with what was being attempted.

Throwing in business logic: throw concrete error subclasses (or at minimum `Error` with a discriminating message prefix like `[posts.create] author missing displayName`) so the route handler can map them to the right status code.

## What NOT to Do

- **Do not** use `middleware.ts` — Next.js 16 uses `proxy.ts` at the repo root. Migrating to `middleware.ts` will silently break auth.
- **Do not** call Firestore Admin SDK from React components. Client components use the Web SDK only for realtime listeners; everything else goes through `src/lib/`.
- **Do not** trust `proxy.ts` alone for auth. Re-check the session in every protected route handler and server action.
- **Do not** denormalize beyond `author{Uid,DisplayName,PhotoURL}` on posts for the MVP. Counters and reverse indexes come later.
- **Do not** add Postgres, Prisma, Supabase, or a separate backend service. This is a Next.js monolith with Firestore.
- **Do not** swap auth providers. Auth0 with the Google social connection, matching the portal pattern.
- **Do not** invest in Terraform / cloud deploy until the MVP is verified in the browser. Local-first.
- **Do not** ship without manually clicking through signup → post → feed in a browser. Type-checks ≠ feature-works.
- **Do not** invent Firestore composite indexes by hand — let queries fail in dev, then copy the link the Firebase error gives you.
- **Do not** add fallbacks, silent defaults, deprecated aliases, or feature flags. See the **Engineering Rules** section above — these are non-negotiable.
- **Do not** cluster all errors into 500. Pick the right status code and write a specific `error` message.

## Commit Hygiene

Small, frequent commits with descriptive messages. The interview clock starts at the first commit and the rubric rewards a visible commit history. Avoid one-giant-commit-at-the-end.
