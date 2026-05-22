# plan.md

Phased build plan. Each phase ends with a working, demoable state. **Do not start phase N+1 until phase N is verified in the browser.**

Time budget: **60 minutes for MVP** (P0–P3). Cloud deploy is stretch only.

## P0 — Project skeleton (5 min)

Use `/scaffold` (or do it manually).

- `npx create-next-app@latest . --typescript --app --tailwind --eslint --no-src-dir` (we want `app/` at root; `src/` will be a parallel sibling for libs).
- Add deps: `@auth0/nextjs-auth0`, `firebase-admin`, `firebase`, `zod`.
- Add devDeps: `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`, `ts-jest`, `@types/jest`, `supertest`.
- Create `proxy.ts` stub at repo root (Next 16, not `middleware.ts`).
- Create `.env.example` with all required vars.
- First commit: `chore: scaffold next.js + auth0 + firestore project`. **The interview clock starts here.**

**Verify:** `npm run dev` boots, default page renders at `:3000`.

## P1 — Auth0 wiring (10 min)

Delegate to `auth0` subagent.

- `src/lib/auth/server-auth.ts` — singleton `Auth0Client`, `Auth0User` and `Auth0Session` types (mirror portal).
- `src/lib/auth/auth0-login.ts` — login/signup URL builders, `sanitizeAuthReturnTo`, Google connection slug constant.
- `src/lib/auth/pathname-requires-auth-session.ts` — list of paths that require a session.
- `proxy.ts` — public route allowlist, optimistic redirect for protected pages, JSON 401 for protected `/api/*`.
- `app/auth/login/route.ts`, `app/auth/callback/route.ts`, `app/auth/logout/route.ts` — defer to `auth0.middleware(request)` where possible.

**Verify:** Click "Sign in with Google" on landing page → Auth0 Universal Login → callback → land on `/feed` (placeholder).

## P2 — Firestore data layer + repositories (10 min)

Delegate to `data-storage` subagent. Schema is the single source of truth in [`docs/data-model.md`](docs/data-model.md).

- `src/lib/firestore/admin.ts` — Admin SDK singleton initialization, uses `GOOGLE_APPLICATION_CREDENTIALS`.
- `src/lib/firestore/converters.ts` — typed `FirestoreDataConverter<T>` for each P0 type.
- `src/lib/users/repository.ts` — `getUser(uid)`, `upsertUserFromSession(session)`, `searchUsersByName(prefix)`.
- `src/lib/friendships/repository.ts` — list my friends, check friendship, accept/reject request (transactional).
- `src/lib/friend-requests/repository.ts` — send / list inbox / withdraw a `friendRequests/{fromUid_toUid}` doc.
- `src/lib/wall-posts/repository.ts` — `createWallPost(authorUid, wallOwnerUid, text)` (friendship-gated), `listWall(uid)`, `listFriendActivityFeed(uid)`.
- `src/lib/pokes/repository.ts` — `poke(fromUid, toUid)`, `listPokes(uid)`, `acknowledgePoke(id)`.
- Auth0 post-callback hook: on first login, upsert the user doc from the session and seed `nameTokens` / `displayNameLower`.

**Verify:** Manually create a wall post via a test script or REPL; confirm it appears in Firestore console.

## P3 — UI for the core loop (25 min)

Delegate to `frontend` subagent. Run these in parallel where possible:

- `app/page.tsx` — landing page with "Sign in with Google" button.
- `app/(app)/feed/page.tsx` — server component, fetches feed, renders `<PostList />`.
- `app/(app)/feed/PostComposer.tsx` — client component, posts to `/api/posts`.
- `app/(app)/profile/[uid]/page.tsx` — user's posts, profile header.
- `app/api/posts/route.ts` — `POST` (create), `GET` (list feed). Validates via zod, recheck session.
- `app/api/users/[uid]/route.ts` — `GET` profile.

**Verify in browser:** Sign up → land on feed → write a post → see it appear → visit own profile → see post listed. **This is the MVP gate.** If this works, commit and tag `v0.1-mvp`.

## P4 — Tests (parallel with P3 where possible — delegate to `testing` subagent)

- Unit: `sanitizeAuthReturnTo`, post text validation, converter shape.
- Integration: `POST /api/posts` with mocked Auth0 session + Firestore emulator; assert doc shape.
- Snapshot for `<PostList />` rendering.

**Verify:** `npm test` green.

## P5 — Stretch: social features (only if time remains)

- Likes: `posts/{postId}/likes/{uid}` subcollection; optimistic UI; counter via Firestore aggregation.
- Comments: `posts/{postId}/comments/{commentId}` subcollection; threaded under each post.
- Follows: `follows/{follower}_{followee}` doc; follow button on profile; feed filter for "following only".

## P6 — Stretch: cloud deploy (only if MVP + tests are green)

Delegate to `infra-terraform` subagent.

- `infra/terraform/` mirroring `infra-bootstrap-foundations-gcp` module style.
- Cloud Run service, Firestore IAM, GCS bucket for static assets if needed.
- Single `terraform apply`; smoke-test the public URL.
- DNS / custom domain explicitly out of scope.

## Discipline

- Commit after every phase passes its verify step. Conventional commits (`feat:`, `chore:`, `test:`, `fix:`).
- If a phase blocks for >10 min, cut scope or punt to stretch.
- Run `/verify` before each commit.
- **Browser verification > type-check verification.** Always click through the feature.
