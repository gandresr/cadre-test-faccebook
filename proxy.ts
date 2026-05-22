import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth0 } from "@/src/lib/auth/auth0";
import { buildSignupHref } from "@/src/lib/auth/auth0-login";
import { pathnameRequiresAuthSession } from "@/src/lib/auth/pathname-requires-auth-session";

/**
 * Next.js 16 proxy (replaces `middleware.ts`). Best-effort auth gate; the DAL
 * (`src/lib/...`) and per-route layouts re-verify every protected access.
 *
 * Tiers:
 * - Public: `/`, `/auth/signup`, `/auth/sign-in`, SDK auth routes, `/api/health`.
 * - Auth-required (UI): paths matched by `pathnameRequiresAuthSession()` — unauth users
 *   get redirected to `/auth/signup?returnTo=<path>`.
 * - Auth-required (API): same matcher returns JSON 401.
 *
 * The DB-row check (`users/{uid}` exists in Firestore) happens in
 * `app/(app)/layout.tsx` — the layout redirects to `/auth/signup` when missing.
 * Mirrors `web-webapp-portal/proxy.ts`.
 */

const SKIP_PREFIXES = [
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
];

const AUTH_SDK_ROUTES = [
  "/auth/login",
  "/auth/logout",
  "/auth/callback",
  "/auth/profile",
  "/auth/access-token",
  "/auth/backchannel-logout",
];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  let authResponse: NextResponse;
  let session: Awaited<ReturnType<typeof auth0.getSession>> = null;
  try {
    authResponse = await auth0.middleware(request);
    session = await auth0.getSession(request);
  } catch (error) {
    console.warn(
      "[proxy] auth middleware/session error (treating as unauthenticated):",
      error,
    );
    if (AUTH_SDK_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.json(
        {
          error:
            "Authentication service temporarily unavailable; check AUTH0_SECRET on the server",
        },
        { status: 503 },
      );
    }
    authResponse = NextResponse.next();
    session = null;
  }

  const isUnauthorized = !session?.user;

  // `/auth/signup` and `/auth/sign-in` are public — the page itself decides
  // whether to render the Google CTA, render the "Complete sign-up" form
  // (authed + no Firestore row), or redirect away (authed + has row). The
  // proxy must not short-circuit them, or authed-but-not-registered users
  // bounce in a loop between `/auth/signup` and the (app) layout.

  if (isUnauthorized && pathnameRequiresAuthSession(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized: sign in at /auth/sign-in" },
        { status: 401 },
      );
    }
    const returnTo = `${pathname}${search}`;
    return NextResponse.redirect(
      new URL(buildSignupHref(returnTo), request.url),
    );
  }

  return authResponse;
}
