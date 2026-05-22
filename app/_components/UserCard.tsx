import Link from "next/link";
import type { User } from "@/src/lib/types";

/**
 * Compact = small photo + name + meta on a single row (search results).
 * Non-compact = larger photo with name + meta stacked below (friends grid).
 */
export function UserCard({
  user,
  compact = true,
}: {
  user: User;
  compact?: boolean;
}) {
  if (!user) {
    throw new Error("[UserCard] user prop is required");
  }
  const profileHref = `/profile/${user.uid}`;
  const photo = user.photoURL ?? `https://i.pravatar.cc/150?u=${user.uid}`;

  if (compact) {
    return (
      <div className="flex items-start gap-3">
        <Link
          href={profileHref}
          aria-label={user.displayName}
          className="shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={user.displayName}
            width={48}
            height={48}
            className="block h-12 w-12 border border-app-border bg-app-surface-raised object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={profileHref}
            className="block text-[13px] font-semibold text-app-text-primary hover:text-app-brand hover:no-underline"
          >
            {user.displayName}
          </Link>
          {user.network ? (
            <span className="block truncate text-[12px] italic text-app-text-tertiary">
              {user.network}
            </span>
          ) : null}
          {user.status ? (
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-app-text-secondary">
              {user.status}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Link href={profileHref} aria-label={user.displayName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={user.displayName}
          width={100}
          height={100}
          className="block h-[100px] w-[100px] border border-app-border bg-app-surface-raised object-cover transition-[border-color] hover:border-app-brand"
        />
      </Link>
      <Link
        href={profileHref}
        className="text-[13px] font-semibold text-app-text-primary hover:text-app-brand hover:no-underline"
      >
        {user.displayName}
      </Link>
      {user.network ? (
        <span className="text-[11px] italic text-app-text-tertiary">
          {user.network}
        </span>
      ) : null}
    </div>
  );
}
