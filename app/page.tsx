import Link from "next/link";
import { auth0 } from "@/src/lib/auth/auth0";

export default async function Home() {
  const session = await auth0.getSession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-6">
      <div className="w-full max-w-[440px] border border-app-border bg-app-surface px-8 py-10 shadow-[0_1px_2px_rgba(17,17,24,0.04),0_8px_24px_rgba(17,17,24,0.06)]">
        <header className="mb-6 text-center">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-app-brand">
            Social Network 1.0
          </div>
          <h1 className="font-display text-[28px] leading-tight font-semibold tracking-tight text-app-text-primary">
            Welcome
          </h1>
          <p className="mt-2 text-sm leading-snug text-app-text-secondary">
            A small social network in the spirit of 2004. Sign in to see what
            your friends are up to.
          </p>
        </header>

        {!session ? (
          <div className="flex flex-col gap-2">
            <Link
              href="/auth/signup"
              className="block w-full bg-app-brand px-4 py-2.5 text-center text-sm font-medium !text-white transition-colors hover:bg-app-brand-hover hover:!text-white hover:no-underline"
            >
              Create an account
            </Link>
            <Link
              href="/auth/sign-in"
              className="block w-full border border-app-border bg-app-surface px-4 py-2.5 text-center text-sm font-medium text-app-text-primary transition-colors hover:border-app-brand hover:bg-app-surface-raised hover:no-underline"
            >
              Sign in
            </Link>
            <p className="mt-4 text-center text-xs text-app-text-tertiary">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline">
                privacy policy
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-app-text-secondary">
              Signed in as{" "}
              <span className="font-medium text-app-text-primary">
                {session.user.email}
              </span>
            </p>
            <Link
              href="/feed"
              className="block w-full bg-app-brand px-4 py-2.5 text-center text-sm font-medium !text-white transition-colors hover:bg-app-brand-hover hover:!text-white hover:no-underline"
            >
              Go to feed
            </Link>
            <a
              href="/auth/logout"
              className="block w-full border border-app-border bg-app-surface px-4 py-2.5 text-center text-sm font-medium text-app-text-primary transition-colors hover:border-app-brand hover:bg-app-surface-raised hover:no-underline"
            >
              Log out
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
