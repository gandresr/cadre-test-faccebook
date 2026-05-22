import { Suspense } from "react";
import { sanitizeUid } from "@/src/lib/uid";
import { redirect } from "next/navigation";

import { auth0 } from "@/src/lib/auth/auth0";
import {
  buildSignupHref,
  sanitizeAuthReturnTo,
} from "@/src/lib/auth/auth0-login";
import { getUser } from "@/src/lib/users/repository";

import { SignupForm } from "../signup/SignupForm";

type Search = { returnTo?: string };

/**
 * Branded sign-in page (separate from the SDK-reserved `/auth/login`).
 *
 * - Auth0 session + Firestore profile → redirect to `returnTo`.
 * - Auth0 session, no Firestore profile → redirect to `/auth/signup`
 *   (user must register before they can sign in).
 * - No session → render the Google sign-in card.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const returnTo = sanitizeAuthReturnTo(params.returnTo, "/feed");

  const session = await auth0.getSession();
  if (session?.user) {
    const sub = typeof session.user.sub === "string" ? session.user.sub : null;
    if (!sub) {
      throw new Error(
        "[auth/sign-in] Auth0 session missing 'sub' claim; re-authenticate.",
      );
    }
    const uid = sanitizeUid(sub);
    const existing = await getUser(uid);
    if (existing) {
      redirect(returnTo);
    }
    redirect(`${buildSignupHref(returnTo)}&error=no_account`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-6">
      <Suspense fallback={<div className="h-72 w-full max-w-[440px]" />}>
        <SignupForm mode="login" />
      </Suspense>
    </main>
  );
}
