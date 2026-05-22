import { redirect } from "next/navigation";
import { sanitizeUid } from "@/src/lib/uid";

import { Footer } from "@/app/_components/Footer";
import { TopBar } from "@/app/_components/TopBar";
import { auth0 } from "@/src/lib/auth/auth0";
import { buildSignupHref } from "@/src/lib/auth/auth0-login";
import { getUser } from "@/src/lib/users/repository";

/**
 * Authenticated shell. Runs on every RSC request:
 *   1. Verify Auth0 session — redirect to /auth/sign-in if missing.
 *   2. Load the current user's Firestore doc. If missing, redirect to
 *      /auth/signup?error=no_account — registration is form-driven and
 *      must go through `POST /api/users/register`; this layout never
 *      writes to Firestore.
 *   3. Render the navy TopBar + main content + Footer chrome.
 *
 * `proxy.ts` gates /app/* optimistically; this layout is the authoritative
 * DAL check (CLAUDE.md DAL pattern).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    redirect("/auth/sign-in");
  }

  const uid = sanitizeUid(session.user.sub);
  const me = await getUser(uid);
  if (!me) {
    redirect(`${buildSignupHref("/feed")}&error=no_account`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-app-background text-app-text-primary">
      <TopBar currentUser={me} />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
