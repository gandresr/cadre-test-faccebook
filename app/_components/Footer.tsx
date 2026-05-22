/**
 * Static footer with stub links and the Zuckerberg-production homage.
 * Subtle by design — sits below the surface, gets out of the way.
 */
export function Footer() {
  return (
    <footer className="mt-10 w-full border-t border-app-border bg-app-background">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-2 px-5 py-6 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-app-text-tertiary">
          <a href="#" className="hover:text-app-brand hover:no-underline">
            About
          </a>
          <span aria-hidden="true">·</span>
          <a href="#" className="hover:text-app-brand hover:no-underline">
            Jobs
          </a>
          <span aria-hidden="true">·</span>
          <a href="#" className="hover:text-app-brand hover:no-underline">
            Terms
          </a>
          <span aria-hidden="true">·</span>
          <a href="#" className="hover:text-app-brand hover:no-underline">
            Privacy
          </a>
          <span aria-hidden="true">·</span>
          <a href="#" className="hover:text-app-brand hover:no-underline">
            Contact
          </a>
        </nav>
        <p className="text-[10px] tracking-wide text-app-text-tertiary">
          a Mark Zuckerberg production
        </p>
      </div>
    </footer>
  );
}
