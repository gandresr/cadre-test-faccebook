import Link from "next/link";
import type { User } from "@/src/lib/types";

type SidebarKey =
  | "profile"
  | "edit-profile"
  | "friends"
  | "friend-requests"
  | "pokes"
  | "messages"
  | "groups"
  | "account"
  | "privacy"
  | "search"
  | "feed"
  | null;

type Item = {
  href: string;
  label: string;
  key: SidebarKey;
  editHref?: string;
};

/**
 * Embedded left rail used by Feed and Profile pages. Renders the quick
 * search box, a mini-profile card, and the "My …" vertical nav list. Not
 * fixed-position — meant to live inside the (app) layout's content wrapper
 * as a sidebar column in a two-column grid.
 */
export function AppSidebar({
  currentUser,
  active,
}: {
  currentUser: User;
  active?: SidebarKey;
}) {
  const myUid = currentUser.uid;

  const primary: Item[] = [
    {
      href: `/profile/${myUid}`,
      label: "My Profile",
      key: "profile",
      editHref: "/profile/edit",
    },
    { href: `/friends/${myUid}`, label: "My Friends", key: "friends" },
    {
      href: "/friends/requests",
      label: "Friend Requests",
      key: "friend-requests",
    },
    { href: "/pokes", label: "My Pokes", key: "pokes" },
    { href: "/messages", label: "My Messages", key: "messages" },
    { href: "/groups", label: "My Groups", key: "groups" },
  ];

  const secondary: Item[] = [
    { href: "/settings", label: "My Account", key: "account" },
    { href: "/settings#privacy", label: "My Privacy", key: "privacy" },
  ];

  return (
    <aside
      className="sticky top-[72px] w-full self-start border border-app-border bg-app-surface shadow-[0_1px_2px_rgba(17,17,24,0.04)]"
      aria-label="Sidebar"
    >
      {/* Quick search */}
      <form
        action="/search"
        method="get"
        className="border-b border-app-border-subtle bg-app-surface-raised px-3 py-3"
      >
        <label
          htmlFor="sidebar-search"
          className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-app-text-tertiary"
        >
          Quick search
        </label>
        <div className="flex gap-1.5">
          <input
            id="sidebar-search"
            name="q"
            type="search"
            placeholder="Find a person…"
            className="!py-1 text-[12px]"
          />
          <button
            type="submit"
            className="shrink-0 border border-app-border bg-app-surface px-2 py-1 text-[11px] font-medium text-app-text-primary hover:border-app-brand hover:text-app-brand"
          >
            Go
          </button>
        </div>
      </form>

      {/* Mini-profile */}
      <div className="flex items-center gap-3 border-b border-app-border-subtle px-3 py-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden border border-app-border bg-app-surface-raised">
          {currentUser.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <Link
            href={`/profile/${myUid}`}
            className="block truncate text-[13px] font-semibold text-app-text-primary hover:underline"
          >
            {currentUser.displayName}
          </Link>
          {currentUser.network ? (
            <div className="truncate text-[11px] italic text-app-text-tertiary">
              {currentUser.network}
            </div>
          ) : null}
        </div>
      </div>

      {/* Primary nav */}
      <ul className="px-2 py-2">
        {primary.map((item) => {
          const isActive = active === item.key;
          return (
            <li key={item.href}>
              <div
                className={`flex items-center justify-between gap-2 border-l-2 px-2 py-1.5 ${
                  isActive
                    ? "border-app-brand bg-app-brand-subtle"
                    : "border-transparent hover:bg-app-surface-raised"
                }`}
              >
                <Link
                  href={item.href}
                  className={`block flex-1 text-[12.5px] hover:no-underline ${
                    isActive
                      ? "font-semibold text-app-brand"
                      : "text-app-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
                {item.editHref ? (
                  <Link
                    href={item.editHref}
                    className="text-[11px] text-app-text-tertiary hover:text-app-brand"
                  >
                    [edit]
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-app-border-subtle px-2 py-2">
        <ul>
          {secondary.map((item) => {
            const isActive = active === item.key;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-2 py-1 text-[12px] hover:no-underline ${
                    isActive
                      ? "font-semibold text-app-brand"
                      : "text-app-text-secondary hover:text-app-brand"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
