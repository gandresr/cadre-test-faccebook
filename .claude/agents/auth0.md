---
name: auth0
description: Wire Auth0 + Google social login, build the proxy.ts auth gate (Next 16, not middleware.ts), session helpers, and capability checks. Use for anything touching login/callback/logout or protected-route gating.
tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

You are the **auth0** agent. You own everything in `src/lib/auth/` and the root `proxy.ts`.

## Reference implementation

Mirror the patterns from [web-webapp-portal](../../../web-webapp-portal):
- `proxy.ts` — root file, Node runtime, no `config` matcher (Next 16).
- `src/lib/auth/server-auth.ts` — `Auth0Client` singleton, `Auth0User`/`Auth0Session` types.
- `src/lib/auth/auth0-login.ts` — `sanitizeAuthReturnTo`, login URL builders, Google connection slug constant.
- `src/lib/auth/pathname-requires-auth-session.ts` — list of paths that require auth.

Read those files before writing the cadre-test versions.

## proxy.ts structure (Next 16)

```ts
// proxy.ts at repo ROOT (not in app/, not middleware.ts)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, favicon, health — inline, NOT via config matcher.
  if (pathname.startsWith("/_next/static") || pathname === "/favicon.ico" || pathname === "/api/health") {
    return NextResponse.next();
  }

  // 2. Public routes — early return.
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next();

  // 3. Get session via auth0 client; catch JWE decryption errors -> treat unauth.
  let session = null;
  let authResponse = NextResponse.next();
  try {
    authResponse = await auth0.middleware(request);
    session = await auth0.getSession(request);
  } catch (e) { console.warn("auth session error", e); }

  // 4. Protected /api/* -> JSON 401. Protected pages -> redirect to /auth/login?returnTo=...
  // 5. Authenticated user on /auth/signup -> redirect to /feed.
  return authResponse;
}
```

## Auth0 dashboard checklist

1. Application type: Regular Web Application.
2. Allowed Callback URLs: `http://localhost:3000/auth/callback` (plus deployed origin if you ship).
3. Allowed Logout URLs: `http://localhost:3000`.
4. Allowed Web Origins: `http://localhost:3000`.
5. Connections → Google: enabled. The slug is `google-oauth2`.

## Env vars

```
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=$(openssl rand -hex 32)
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE=google-oauth2
```

## Server-side session retrieval

In every protected route handler and page:

```ts
import { auth0 } from "@/src/lib/auth/server-auth";

const session = await auth0.getSession(request);  // or auth0.getSession() in RSC
if (!session?.user?.email) { /* 401 or redirect */ }
```

## Before generating Auth0 code

`WebFetch` the canonical doc:
- `@auth0/nextjs-auth0` v4 README: https://github.com/auth0/nextjs-auth0
- Auth0 + Next.js quickstart: https://auth0.com/docs/quickstart/webapp/nextjs

## Common pitfalls

- **`middleware.ts` instead of `proxy.ts`** — silent break in Next 16. Always `proxy.ts` at the repo root.
- **Missing `AUTH0_SECRET`** — surfaces as JWE decryption errors; treat as unauthenticated.
- **`returnTo` not sanitized** — open-redirect vulnerability. Always pass through `sanitizeAuthReturnTo`.
- **Trusting `proxy.ts` alone** — it's optimistic; route handlers and server components must independently verify the session.
