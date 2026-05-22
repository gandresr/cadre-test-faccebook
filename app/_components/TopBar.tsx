import Link from "next/link";
import type { User } from "@/src/lib/types";

const NAV = [
  { href: "/feed", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/friends/requests", label: "Friend requests" },
  { href: "/pokes", label: "Pokes" },
  { href: "/messages", label: "Messages" },
];

/**
 * Portal-style top bar. Glass-blur white surface, indigo wordmark left,
 * horizontal primary nav center-right, user identity + logout far right.
 */
export function TopBar({ currentUser }: { currentUser: User }) {
  if (!currentUser) {
    throw new Error("[TopBar] currentUser prop is required");
  }
  const firstName = currentUser.displayName.split(/\s+/)[0] || "friend";
  const photo =
    currentUser.photoURL ?? `https://i.pravatar.cc/150?u=${currentUser.uid}`;

  return (
    <header className="sticky top-0 z-50 h-[56px] border-b border-app-border bg-[color-mix(in_srgb,var(--color-app-overlay)_92%,transparent)] backdrop-blur-[14px] backdrop-saturate-[1.15]">
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center gap-6 px-5">
        <Link
          href="/feed"
          aria-label="thefacebook home"
          className="shrink-0 font-display text-[20px] font-semibold tracking-tight text-app-brand hover:no-underline"
        >
          <span className="text-app-brand-hover">[ </span>
          thefacebook
          <span className="text-app-brand-hover"> ]</span>
        </Link>

        <nav className="hidden h-full items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-full items-center border-b-2 border-transparent px-3 text-[13px] text-app-text-secondary transition-colors hover:border-app-brand-muted hover:text-app-text-primary hover:no-underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[12px] text-app-text-secondary sm:inline">
            Hi,{" "}
            <Link
              href={`/profile/${currentUser.uid}`}
              className="font-medium text-app-text-primary hover:underline"
            >
              {firstName}
            </Link>
          </span>
          <Link
            href={`/profile/${currentUser.uid}`}
            aria-label="My profile"
            className="block h-8 w-8 shrink-0 overflow-hidden border border-app-border hover:border-app-brand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={currentUser.displayName}
              className="h-full w-full object-cover"
            />
          </Link>
          <a
            href="/auth/logout"
            className="text-[12px] text-app-text-secondary hover:text-app-brand hover:no-underline"
          >
            Log out
          </a>
        </div>
      </div>
    </header>
  );
}
