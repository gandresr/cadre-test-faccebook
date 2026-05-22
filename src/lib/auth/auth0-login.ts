/**
 * Auth0 entry-URL helpers for `/auth/login` (handled by `@auth0/nextjs-auth0`).
 *
 * Dashboard (Auth0): the Google social connection must be enabled. Override
 * the slug with NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE if your tenant uses a
 * different name.
 */

export const AUTH0_CONNECTION_GOOGLE =
  process.env.NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE ?? "google-oauth2";

export type AuthLoginKind = "google" | "default";

/**
 * Allows same-origin relative paths only — blocks open redirects.
 */
export function sanitizeAuthReturnTo(
  raw: string | null | undefined,
  fallback: string,
): string {
  const t = raw?.trim();
  if (!t || !t.startsWith("/") || t.startsWith("//") || t.includes("\\")) {
    return fallback;
  }
  return t;
}

/**
 * Build a branded signup path that preserves a sanitized `returnTo`.
 */
export function buildSignupHref(returnTo: string): string {
  const safe = sanitizeAuthReturnTo(returnTo, "/feed");
  return `/auth/signup?${new URLSearchParams({ returnTo: safe }).toString()}`;
}

/**
 * Build the `/auth/login` URL that the Auth0 SDK middleware will pick up and
 * forward to `/authorize` with the requested connection / prompt.
 */
export function buildAuthLoginHref(options: {
  returnTo?: string;
  kind: AuthLoginKind;
  screenHint?: "signup" | "login";
}): string {
  const returnTo = sanitizeAuthReturnTo(options.returnTo, "/feed");
  const params = new URLSearchParams({ returnTo });

  if (options.kind === "google") {
    params.set("connection", AUTH0_CONNECTION_GOOGLE);
    params.set("prompt", "select_account");
  } else {
    params.set("prompt", "login");
  }

  if (options.screenHint) {
    params.set("screen_hint", options.screenHint);
  }

  return `/auth/login?${params.toString()}`;
}
