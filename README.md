# Social Network 1.0

A minimal social network inspired by Facebook circa 2004 — signup, profiles, friends, wall posts, pokes, messages, and groups. Built as a Next.js monolith with Auth0 and Cloud Firestore.

## Features

| Area         | What works                                                                     |
| ------------ | ------------------------------------------------------------------------------ |
| **Auth**     | Google sign-in via Auth0; registration form for profile setup                  |
| **Feed**     | Friend activity feed from wall posts across your network                       |
| **Profiles** | View and edit profile (status, basic info, academic, social, favorites, about) |
| **Friends**  | Send/accept/reject friend requests; view friend lists                          |
| **Wall**     | Post on your own wall or a friend's wall (friendship-gated)                    |
| **Pokes**    | Send pokes and acknowledge incoming ones                                       |
| **Search**   | Find users by display name                                                     |
| **Messages** | Private conversations between friends (P1)                                     |
| **Groups**   | Create groups and post on group walls (P2)                                     |

UI follows a 2004-era design language — navy header, lavender section strips, sharp edges. See [docs/pages.md](docs/pages.md) for the full page map and visual spec.

## Tech stack

| Layer      | Choice                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org) (App Router, TypeScript)                                   |
| Auth       | [Auth0](https://auth0.com) with Google social connection (`google-oauth2`)                  |
| Database   | [Cloud Firestore](https://firebase.google.com/docs/firestore) via `firebase-admin` (server) |
| Styling    | Tailwind CSS 4                                                                              |
| Validation | Zod                                                                                         |
| Tests      | Jest + React Testing Library (unit); Firestore emulator (integration)                       |

Auth gating uses `proxy.ts` at the repo root (Next.js 16 replaces `middleware.ts`).

## Prerequisites

- **Node.js 22+** and npm
- An **Auth0** application (Regular Web Application) with Google social connection enabled
- A **GCP project** with Firestore in Native mode, or the Firebase emulator for local-only work
- **Firebase CLI** (`npm i -g firebase-tools`) if you want to run the Firestore emulator

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in Auth0 + Firestore values
cp .env.example .env.local

# 3. Authenticate to GCP (if not using a service-account JSON)
gcloud auth application-default login

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account or sign in with Google, complete registration, and land on `/feed`.

### Verify Firestore connectivity

```bash
# Requires GOOGLE_APPLICATION_CREDENTIALS and FIRESTORE_PROJECT_ID in .env.local
npx tsx scripts/smoke.ts
```

Writes, reads, and deletes a single `_smoke/ping` document against your real Firestore project.

## Environment variables

Copy `.env.example` to `.env.local` and set every value. The app throws on startup if required config is missing — there are no silent defaults.

| Variable                              | Description                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH0_DOMAIN`                        | Auth0 tenant domain (e.g. `your-tenant.us.auth0.com`)                                                                                   |
| `AUTH0_CLIENT_ID`                     | Auth0 application client ID                                                                                                             |
| `AUTH0_CLIENT_SECRET`                 | Auth0 application client secret                                                                                                         |
| `AUTH0_SECRET`                        | Session encryption secret — generate with `openssl rand -hex 32`                                                                        |
| `APP_BASE_URL`                        | App origin (e.g. `http://localhost:3000`)                                                                                               |
| `NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE` | Google connection slug (`google-oauth2`)                                                                                                |
| `FIRESTORE_PROJECT_ID`                | GCP project ID for Firestore                                                                                                            |
| `GOOGLE_APPLICATION_CREDENTIALS`      | _(optional)_ Path to service-account JSON. If unset, uses Application Default Credentials from `gcloud auth application-default login`. |

### Auth0 setup

1. Create a **Regular Web Application** in Auth0.
2. Enable the **Google** social connection and note the slug (`google-oauth2`).
3. Set **Allowed Callback URLs** to `{APP_BASE_URL}/auth/callback`.
4. Set **Allowed Logout URLs** to `{APP_BASE_URL}`.
5. Copy domain, client ID, and client secret into `.env.local`.

## Firestore emulator (local dev)

Run Firestore locally without touching a real GCP project:

```bash
# Terminal 1 — start emulator (Firestore on :8089, UI on :4000)
npm run emulator

# Terminal 2 — point the app at the emulator
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8089
export FIRESTORE_PROJECT_ID=cadre-test-emulator
npm run dev
```

Or seed the emulator in one shot:

```bash
npm run seed:emulator
```

## Seed demo data

Populate a realistic 2004-era social graph (friends, wall posts, pokes, pending requests):

```bash
npm run seed
```

Runs against the project named by `FIRESTORE_PROJECT_ID`. If `FIRESTORE_EMULATOR_HOST` is set, routes to the emulator instead. Idempotent — safe to re-run.

## Commands

| Command                    | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `npm run dev`              | Start Next.js dev server on `:3000`             |
| `npm run build`            | Production build (standalone output for Docker) |
| `npm start`                | Run production server                           |
| `npm run lint`             | ESLint                                          |
| `npm run typecheck`        | TypeScript (`tsc --noEmit`)                     |
| `npm test`                 | Jest — unit + integration projects              |
| `npm run test:integration` | Integration tests only (Firestore emulator)     |
| `npm run test:watch`       | Jest watch mode                                 |
| `npm run emulator`         | Start Firestore emulator                        |
| `npm run seed`             | Seed demo data (real Firestore or emulator)     |
| `npm run seed:emulator`    | Seed against local emulator                     |

## Project structure

```
app/                          # Next.js App Router
  (app)/                      # Authenticated routes (feed, profile, friends, …)
  _components/                # Shared UI (TopBar, WallPostCard, …)
  api/                        # Route handlers (wall-posts, users, friendships, …)
  auth/                       # Sign-in, signup, callback pages
  page.tsx                    # Public landing page
proxy.ts                      # Auth gate (Next 16; not middleware.ts)

src/
  lib/
    auth/                     # Auth0 client, session helpers, login URLs
    firestore/                # Admin SDK singleton + typed converters
    */repository.ts           # Domain data access (users, wall-posts, pokes, …)
  types.ts                    # Shared TypeScript types

docs/
  data-model.md               # Firestore schema (source of truth)
  pages.md                    # Route map + 2004 UI spec

scripts/
  seed.ts                     # Demo data seeder
  smoke.ts                    # Firestore connectivity check
```

## Architecture

```
Browser → proxy.ts (optimistic auth gate)
       → app/(app)/layout.tsx (session + Firestore user check)
       → page / route handler
       → src/lib/*/repository.ts
       → Firestore Admin SDK
```

- **Public routes:** `/`, `/auth/signup`, `/auth/sign-in`, Auth0 SDK routes, `/api/health`.
- **Protected routes:** everything under `app/(app)/` and `/api/*` (except health). Unauthenticated users are redirected to sign-in; API calls return `401`.
- **Data access:** all Firestore reads/writes go through `src/lib/` — never from React components directly.
- **Registration:** Auth0 handles identity; `POST /api/users/register` creates the Firestore user doc. The `(app)` layout redirects to signup if the doc is missing.

For the full schema, see [docs/data-model.md](docs/data-model.md).

## Docker / Cloud Run

The repo includes a multi-stage `Dockerfile` that produces a standalone Next.js image for Cloud Run (`output: "standalone"` in `next.config.ts`).

```bash
docker build -t social-network .
docker run -p 3000:3000 \
  -e AUTH0_DOMAIN=... \
  -e AUTH0_CLIENT_ID=... \
  -e AUTH0_CLIENT_SECRET=... \
  -e AUTH0_SECRET=... \
  -e APP_BASE_URL=http://localhost:3000 \
  -e FIRESTORE_PROJECT_ID=... \
  social-network
```

Terraform for GCS-backed Cloud Run deployment is a stretch goal — see [plan.md](plan.md) phase P6.

## Testing

```bash
npm test                  # all tests
npm run test:integration  # Firestore emulator-backed tests
```

Unit tests live next to source (`foo.test.ts`). Integration tests use the `.integration.test.ts` suffix and require the Firestore emulator running.

## Related docs

| Doc                                      | Purpose                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| [plan.md](plan.md)                       | Phased build plan (P0–P6)                                                 |
| [CLAUDE.md](CLAUDE.md)                   | AI assistant context — stack rules, architecture, engineering constraints |
| [docs/data-model.md](docs/data-model.md) | Firestore collections, types, indexes                                     |
| [docs/pages.md](docs/pages.md)           | Routes, user stories, UI components                                       |
