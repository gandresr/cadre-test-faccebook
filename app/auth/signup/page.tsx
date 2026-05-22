import { Suspense } from "react";
import { sanitizeUid } from "@/src/lib/uid";
import { redirect } from "next/navigation";

import { auth0 } from "@/src/lib/auth/auth0";
import { sanitizeAuthReturnTo } from "@/src/lib/auth/auth0-login";
import { getUser } from "@/src/lib/users/repository";

import { RegistrationForm } from "./RegistrationForm";
import { SignupForm } from "./SignupForm";

type Search = { returnTo?: string; error?: string };

/**
 * Branded sign-up page. Three states:
 *
 *  - **No session** → render the Google CTA. Optional `error=no_account`
 *    surfaces a flash banner when the user landed here from `/auth/sign-in`
 *    without a Firestore row.
 *  - **Session + no Firestore row** → render `RegistrationForm`. The form
 *    POSTs to `/api/users/register` which writes the doc and returns a
 *    `redirectTo`. No silent upsert anywhere — registration only happens
 *    via an explicit user action.
 *  - **Session + Firestore row** → redirect to `returnTo` (defense-in-depth;
 *    the proxy may already have bounced them).
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const returnTo = sanitizeAuthReturnTo(params.returnTo, "/feed");
  const noAccountFlash = params.error === "no_account";

  const session = await auth0.getSession();
  const sessionUser = session?.user ?? null;

  if (sessionUser) {
    const sub = typeof sessionUser.sub === "string" ? sessionUser.sub : null;
    const email =
      typeof sessionUser.email === "string" ? sessionUser.email : null;
    const name =
      (typeof sessionUser.name === "string" && sessionUser.name) ||
      (typeof sessionUser.nickname === "string" && sessionUser.nickname) ||
      email ||
      null;
    const picture =
      typeof sessionUser.picture === "string" ? sessionUser.picture : null;

    if (!sub || !email || !name) {
      throw new Error(
        "[auth/signup] Auth0 session present but missing required claims (sub/email/name); re-authenticate at /auth/sign-in",
      );
    }

    const uid = sanitizeUid(sub);
    const existing = await getUser(uid);
    if (existing) {
      redirect(returnTo);
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-app-background p-6">
        <RegistrationForm
          email={email}
          name={name}
          picture={picture}
          returnTo={returnTo}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-6">
      <Suspense fallback={<div className="h-72 w-full max-w-[440px]" />}>
        <SignupForm mode="signup" noAccountFlash={noAccountFlash} />
      </Suspense>
    </main>
  );
}
