/**
 * Server-side helper to fetch the authenticated user's Firestore doc.
 *
 * Use inside server components and route handlers AFTER `proxy.ts` has gated
 * the route. Throws with specific, actionable messages — never returns a
 * partial/anonymous user.
 *
 * `tryGetCurrentUser` is the non-throwing variant for pages that render
 * differently for signed-in vs anonymous visitors.
 */

import "server-only";

import { auth0 } from "./auth0";
import { getUser } from "@/src/lib/users/repository";
import type { User } from "@/src/lib/types";
import { sanitizeUid } from "@/src/lib/uid";

export async function getCurrentUser(): Promise<User> {
  const session = await auth0.getSession();
  const sub =
    session && typeof session.user?.sub === "string" ? session.user.sub : null;
  if (!sub) {
    throw new Error(
      `[getCurrentUser] no Auth0 session; caller must check before using protected data`,
    );
  }
  const uid = sanitizeUid(sub);
  const user = await getUser(uid);
  if (!user) {
    throw new Error(
      `[getCurrentUser] user ${uid} has session but no Firestore doc; layout should have provisioned it`,
    );
  }
  return user;
}

export async function tryGetCurrentUser(): Promise<User | null> {
  const session = await auth0.getSession();
  const sub =
    session && typeof session.user?.sub === "string" ? session.user.sub : null;
  if (!sub) return null;
  const uid = sanitizeUid(sub);
  return getUser(uid);
}
