/**
 * Transient placeholder for the /auth/callback path. The Auth0 SDK normally
 * intercepts this URL inside proxy.ts (via auth0.middleware) and redirects
 * before this page ever renders. We keep a minimal loading screen here as
 * a fallback so the user does not stare at a blank tab if the redirect is
 * slow.
 */
export default function AuthCallback() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-fb-bg-soft font-sans">
      <p className="text-[13px] text-fb-text-muted">Signing you in…</p>
    </main>
  );
}
