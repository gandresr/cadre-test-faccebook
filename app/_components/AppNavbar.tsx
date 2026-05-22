import Link from "next/link";
import type { User } from "@/src/types";

const NAV = [
  { href: "/feed", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/friends/requests", label: "Friend requests" },
  { href: "/pokes", label: "Pokes" },
  { href: "/messages", label: "Messages" },
];

type ActiveKey =
  | "home"
  | "search"
  | "friend-requests"
  | "pokes"
  | "messages"
  | "profile"
  | null;

const HREF_TO_KEY: Record<string, ActiveKey> = {
  "/feed": "home",
  "/search": "search",
  "/friends/requests": "friend-requests",
  "/pokes": "pokes",
  "/messages": "messages",
};

export function AppNavbar({
  currentUser,
  active,
}: {
  currentUser: User;
  active?: ActiveKey;
}) {
  const firstName =
    currentUser.displayName.split(/\s+/)[0] || currentUser.displayName;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-[56px] border-b border-app-border bg-[color-mix(in_srgb,var(--color-app-overlay)_88%,transparent)] backdrop-blur-[14px] backdrop-saturate-[1.15]"
      aria-label="Primary"
    >
      <div className="mx-auto flex h-full max-w-[1280px] items-center gap-6 px-5">
        <Link
          href="/feed"
          className="flex shrink-0 items-center gap-2 text-app-brand hover:no-underline"
        >
          <span className="font-display text-[20px] font-semibold tracking-tight text-app-brand">
            [ thefacebook ]
          </span>
        </Link>

        <ul className="flex h-full items-center gap-1">
          {NAV.map((item) => {
            const key = HREF_TO_KEY[item.href];
            const isActive = key && active === key;
            return (
              <li key={item.href} className="h-full">
                <Link
                  href={item.href}
                  className={`flex h-full items-center px-3 text-sm transition-colors hover:no-underline ${
                    isActive
                      ? "border-b-2 border-app-brand text-app-text-primary"
                      : "border-b-2 border-transparent text-app-text-secondary hover:text-app-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-app-text-secondary sm:inline">
            Welcome,{" "}
            <Link
              href={`/profile/${currentUser.uid}`}
              className="font-medium text-app-text-primary hover:underline"
            >
              {firstName}
            </Link>
          </span>
          {}
          <Link
            href={`/profile/${currentUser.uid}`}
            aria-label="My profile"
            className={`flex h-8 w-8 items-center justify-center overflow-hidden border ${
              active === "profile" ? "border-app-brand" : "border-app-border"
            } bg-app-surface-raised`}
          >
            {currentUser.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-semibold text-app-text-secondary">
                {firstName[0]}
              </span>
            )}
          </Link>
          <a
            href="/auth/logout"
            className="text-xs text-app-text-secondary hover:text-app-brand hover:no-underline"
          >
            Log out
          </a>
        </div>
      </div>
    </nav>
  );
}
