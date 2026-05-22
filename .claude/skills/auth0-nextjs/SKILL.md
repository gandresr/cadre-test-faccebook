---
name: auth0-nextjs
description: Use when wiring Auth0 + Google social login into Next.js, building the `proxy.ts` auth gate, retrieving sessions in server components/handlers, or anything related to `@auth0/nextjs-auth0` v4+. Triggers on mentions of Auth0, Auth0Client, getSession, /auth/login, /auth/callback, Universal Login, JWE decryption.
---

# Auth0 + Next.js 16 — canonical wiring

## Step 1 — Fetch the current SDK docs

```
WebFetch url=https://github.com/auth0/nextjs-auth0
WebFetch url=https://auth0.com/docs/quickstart/webapp/nextjs
```

Also read the reference implementation in this monorepo: [web-webapp-portal/proxy.ts](../../../../web-webapp-portal/proxy.ts) and [web-webapp-portal/src/lib/auth/](../../../../web-webapp-portal/src/lib/auth).

## Step 2 — Auth0 dashboard setup (do this in parallel with code)

1. Create an Application: **Regular Web Application**.
2. Settings → Application URIs:
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
3. Authentication → Social → enable **Google**. Connection name stays `google-oauth2`.
4. Copy Domain, Client ID, Client Secret into `.env.local`.

## Step 3 — Env vars

```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=$(openssl rand -hex 32)     # required for JWE session encryption
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE=google-oauth2
```

If `AUTH0_SECRET` is missing or rotates, you'll see `JWEDecryptionFailed` errors and users will be silently logged out. Always rotate via env, never inline.

## Step 4 — Auth0 client singleton

```ts
// src/lib/auth/server-auth.ts
import { Auth0Client } from "@auth0/nextjs-auth0/server";

function resolveAppBaseUrl() {
  return process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
}

export const auth0 = new Auth0Client({
  appBaseUrl: resolveAppBaseUrl(),
  // OIDC RP-initiated logout can exceed URL limits in dev; use v2 locally.
  logoutStrategy: process.env.NODE_ENV !== "production" ? "v2" : "auto",
});

export type Auth0User = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  [key: string]: unknown;
};

export type Auth0Session = { user: Auth0User; [key: string]: unknown };
```

## Step 5 — Login URL builders (Google straight-through)

```ts
// src/lib/auth/auth0-login.ts
export const AUTH0_CONNECTION_GOOGLE =
  process.env.NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE ?? "google-oauth2";

export function sanitizeAuthReturnTo(raw: string | null | undefined, fallback: string): string {
  const t = raw?.trim();
  if (!t || !t.startsWith("/") || t.startsWith("//") || t.includes("\\")) return fallback;
  return t;
}

export function buildGoogleSignupHref(returnTo: string): string {
  const safe = sanitizeAuthReturnTo(returnTo, "/feed");
  const qs = new URLSearchParams({
    connection: AUTH0_CONNECTION_GOOGLE,
    screen_hint: "signup",
    returnTo: safe,
  });
  return `/auth/login?${qs.toString()}`;
}
```

## Step 6 — `proxy.ts` (mirror the portal pattern)

See `nextjs-app-router` skill for the full template. Key checks:

1. Public-route allowlist before any session work.
2. `try/catch` around `auth0.getSession()` — JWE errors → treat as unauthenticated.
3. Unauth + protected `/api/*` → JSON 401.
4. Unauth + protected page → redirect to `/auth/login?returnTo=...`.
5. Auth + `/auth/signup` (or `/`) → redirect to `/feed`.

## Step 7 — Server-side session in route handlers and pages

```ts
import { auth0 } from "@/src/lib/auth/server-auth";

// In a route handler:
const session = await auth0.getSession(request);

// In a server component:
const session = await auth0.getSession();

if (!session?.user) { /* redirect or 401 */ }
```

## Step 8 — Sync the user into Firestore on first login

In `app/auth/callback/route.ts` (or a `onCallback` hook), after the session is established, upsert `users/{uid}`. The auth0 sub is the source of truth; replace `|` with `_` to make it a valid Firestore doc ID.

```ts
const uid = session.user.sub.replace(/\|/g, "_");
await db.collection("users").doc(uid).set({
  uid,
  email: session.user.email,
  displayName: session.user.name ?? session.user.nickname ?? "Anonymous",
  photoURL: session.user.picture ?? null,
  createdAt: FieldValue.serverTimestamp(),
}, { merge: true });
```

## Common pitfalls

- **`middleware.ts` instead of `proxy.ts`** in Next 16 — silently no-op. Always `proxy.ts`.
- **Missing `AUTH0_SECRET`** — 503 on `/auth/callback`.
- **Open redirect via `returnTo`** — always pass through `sanitizeAuthReturnTo`.
- **Trusting `proxy.ts` alone** — recheck session in every protected handler/page.
- **Wrong connection slug** — Google is `google-oauth2`, not `google`.
- **`appBaseUrl` mismatch** — must equal the actual served origin; Auth0 will reject the callback otherwise.
