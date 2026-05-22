import "server-only";

import { redirect } from "next/navigation";

import { auth0 } from "@/src/lib/auth/auth0";
import { buildSignupHref } from "@/src/lib/auth/auth0-login";
import { sanitizeUid } from "@/src/lib/uid";

export type Auth0User = {
  [key: string]: unknown;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string | null;
};

/**
 * Requires any authenticated Auth0 user with a usable email and `sub`.
 * Redirects to `/auth/signup` with the requested `returnTo` when no session.
 *
 * Mirrors `web-webapp-portal/src/lib/auth/require-auth-session.ts`.
 *
 * @param returnToIfMissing path to return to after sign-in / sign-up.
 */
export async function requireAuthSession(
  returnToIfMissing: string,
): Promise<{ user: Auth0User; email: string; sub: string; uid: string }> {
  const session = await auth0.getSession();
  const user = (session?.user ?? null) as Auth0User | null;
  const sub = typeof user?.sub === "string" ? user.sub : null;
  const rawEmail = typeof user?.email === "string" ? user.email : null;
  if (!user || !sub || !rawEmail || !rawEmail.trim()) {
    redirect(buildSignupHref(returnToIfMissing));
  }
  return {
    user,
    email: rawEmail.toLowerCase(),
    sub,
    uid: sanitizeUid(sub),
  };
}
