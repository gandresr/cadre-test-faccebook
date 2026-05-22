import Link from "next/link";
import { AppSidebar } from "@/app/_components/AppSidebar";
import { SectionPanel } from "@/app/_components/SectionPanel";
import { ProfileSidebar } from "@/app/_components/ProfileSidebar";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { getUser } from "@/src/lib/users/repository";
import { listWall } from "@/src/lib/wall-posts/repository";
import {
  areFriends,
  getMutualFriendCount,
} from "@/src/lib/friendships/repository";
import { InformationPanel } from "./_components/InformationPanel";
import { WallSection } from "./_components/WallSection";

type ProfilePageProps = {
  params: Promise<{ uid: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const me = await getCurrentUser();
  const { uid } = await params;
  const user = await getUser(uid);

  if (!user) {
    return (
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <AppSidebar currentUser={me} active="profile" />
        <section className="min-w-0">
          <SectionPanel title="User not found">
            <p className="mb-3 text-sm text-app-text-secondary">
              No user with uid <code className="text-[12px]">{uid}</code>{" "}
              exists.
            </p>
            <Link href="/feed" className="text-sm text-app-brand underline">
              ← Back to home
            </Link>
          </SectionPanel>
        </section>
      </div>
    );
  }

  const isSelf = uid === me.uid;
  const friend = !isSelf ? await areFriends(me.uid, uid) : false;
  // Known limitation: page-level friend-request status isn't queried in MVP.
  // The FriendButton reconciles by hitting POST and handling 409 from the API.
  const outRequest = false;
  const inRequest = false;
  const wallPosts = await listWall(uid, 50);
  const mutual = !isSelf ? await getMutualFriendCount(me.uid, uid) : 0;

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      {/* App-wide left rail */}
      <AppSidebar currentUser={me} active="profile" />

      {/* Profile main column */}
      <section className="min-w-0">
        {/* Page header */}
        <header className="mb-5 border-b border-app-border-subtle pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-tertiary">
            Profile
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-app-text-primary">
              {user.displayName}
            </h1>
            {isSelf ? (
              <span className="inline-block border border-app-border bg-app-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-app-text-secondary">
                this is you
              </span>
            ) : null}
          </div>
          {user.network ? (
            <p className="mt-1 text-sm italic text-app-text-secondary">
              {user.network}
            </p>
          ) : null}
        </header>

        {/* Two-column body inside profile: sidebar card + content stack */}
        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <div>
            <ProfileSidebar
              user={user}
              viewingAs={me}
              isFriend={friend}
              hasOutgoingRequest={outRequest}
              hasIncomingRequest={inRequest}
              mutualFriendCount={mutual}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <SectionPanel
              title="Status"
              editHref={isSelf ? "/profile/edit" : undefined}
            >
              {user.status ? (
                <p className="text-[14px] leading-snug">{user.status}</p>
              ) : (
                <p className="text-[13px] italic text-app-text-tertiary">
                  No status set.
                </p>
              )}
            </SectionPanel>

            <InformationPanel user={user} canEdit={isSelf} />

            <WallSection
              wallOwner={user}
              viewingAs={me}
              canPost={isSelf || friend}
              wallPosts={wallPosts}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
