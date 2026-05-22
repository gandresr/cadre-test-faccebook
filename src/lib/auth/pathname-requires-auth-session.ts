/**
 * Paths that require an authenticated Auth0 session.
 *
 * Not listed here (remain reachable without session): `/`, `/auth/signup`,
 * `/auth/sign-in`, `/auth/login`, `/auth/logout`, `/auth/callback`,
 * `/auth/profile`, `/api/health`.
 *
 * Mirrors `web-webapp-portal/src/lib/auth/pathname-requires-auth-session.ts`.
 */
const PROTECTED_PREFIXES = [
  "/feed",
  "/profile",
  "/search",
  "/groups",
  "/messages",
  "/pokes",
  "/friends",
];

export function pathnameRequiresAuthSession(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/health")) return false;
    return true;
  }
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
