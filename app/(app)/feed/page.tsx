import Link from "next/link";
import { AppSidebar } from "@/app/_components/AppSidebar";
import { SectionPanel } from "@/app/_components/SectionPanel";
import { WallPostCard } from "@/app/_components/WallPostCard";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { listFriendActivityFeed } from "@/src/lib/wall-posts/repository";
import { getUser } from "@/src/lib/users/repository";

export default async function FeedPage() {
  const me = await getCurrentUser();
  const activity = await listFriendActivityFeed(me.uid, 50);

  // Resolve wall-owner display names for the "Author → Owner's wall" byline.
  const ownerUids = Array.from(new Set(activity.map((p) => p.wallOwnerUid)));
  const ownerEntries = await Promise.all(
    ownerUids.map(async (uid) => {
      const u = await getUser(uid);
      return [uid, u?.displayName ?? null] as const;
    }),
  );
  const ownerNames = new Map(ownerEntries);

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[220px_1fr_260px]">
      {/* Left rail */}
      <AppSidebar currentUser={me} active="feed" />

      {/* Main column */}
      <section className="min-w-0">
        <header className="mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-tertiary">
            Home
          </div>
          <h1 className="mt-0.5 font-display text-[24px] font-semibold leading-tight tracking-tight text-app-text-primary">
            What&apos;s new
          </h1>
          <p className="mt-1 text-sm text-app-text-secondary">
            Recent wall activity from your friends.
          </p>
        </header>

        <SectionPanel
          title={`Recent activity · ${activity.length} ${activity.length === 1 ? "post" : "posts"}`}
          flush
        >
          {activity.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="mb-2 text-sm font-medium text-app-text-primary">
                No activity yet.
              </p>
              <p className="text-sm text-app-text-secondary">
                <Link href="/search" className="text-app-brand underline">
                  Find friends
                </Link>{" "}
                or{" "}
                <Link
                  href={`/profile/${me.uid}`}
                  className="text-app-brand underline"
                >
                  post on your own wall
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-app-border-subtle">
              {activity.map((post) => (
                <li
                  key={post.id}
                  className="px-4 py-3 transition-colors hover:bg-app-surface-raised"
                >
                  <WallPostCard
                    post={post}
                    showWallOwner
                    wallOwnerDisplayName={
                      ownerNames.get(post.wallOwnerUid) ?? undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </section>

      {/* Right rail */}
      <aside
        className="hidden flex-col gap-4 self-start lg:flex"
        aria-label="Sidebar"
      >
        <SectionPanel title="Shortcuts">
          <ul className="-mx-1 flex flex-col gap-0.5 text-sm">
            <li>
              <Link
                href={`/profile/${me.uid}`}
                className="block px-1 py-1 text-app-text-primary hover:bg-app-surface-raised hover:no-underline"
              >
                View my profile
              </Link>
            </li>
            <li>
              <Link
                href="/profile/edit"
                className="block px-1 py-1 text-app-text-primary hover:bg-app-surface-raised hover:no-underline"
              >
                Edit my profile
              </Link>
            </li>
            <li>
              <Link
                href={`/friends/${me.uid}`}
                className="block px-1 py-1 text-app-text-primary hover:bg-app-surface-raised hover:no-underline"
              >
                Browse my friends
              </Link>
            </li>
            <li>
              <Link
                href="/friends/requests"
                className="block px-1 py-1 text-app-text-primary hover:bg-app-surface-raised hover:no-underline"
              >
                Friend requests
              </Link>
            </li>
          </ul>
        </SectionPanel>

        <SectionPanel title="At a glance">
          <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-[13px]">
            <dt className="text-app-text-secondary">Friends</dt>
            <dd className="font-semibold text-app-text-primary">
              {me.counts?.friends ?? 0}
            </dd>
            <dt className="text-app-text-secondary">Wall posts</dt>
            <dd className="font-semibold text-app-text-primary">
              {me.counts?.wallPosts ?? 0}
            </dd>
            <dt className="text-app-text-secondary">Unread pokes</dt>
            <dd className="font-semibold text-app-text-primary">
              {me.counts?.pokesReceived ?? 0}
            </dd>
          </dl>
        </SectionPanel>
      </aside>
    </div>
  );
}
