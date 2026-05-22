import { SubNav } from "@/app/_components/SubNav";
import { SectionPanel } from "@/app/_components/SectionPanel";
import { UserCard } from "@/app/_components/UserCard";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { getUser } from "@/src/lib/users/repository";
import {
  getFriendUids,
  getMutualFriendCount,
} from "@/src/lib/friendships/repository";
import type { User } from "@/src/types";

type FriendsListPageProps = {
  params: Promise<{ uid: string }>;
};

export default async function FriendsListPage({
  params,
}: FriendsListPageProps) {
  const me = await getCurrentUser();
  const { uid } = await params;
  if (!uid) {
    throw new Error("[friends/[uid]] route param `uid` is missing");
  }

  const owner = await getUser(uid);

  if (!owner) {
    return (
      <div>
        <SubNav active="friends" />
        <header className="mb-4">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-app-text-primary">
            Friends
          </h1>
        </header>
        <SectionPanel title="Not found">
          <p className="text-sm text-app-text-secondary">
            User{" "}
            <span className="font-medium text-app-text-primary">{uid}</span> not
            found.
          </p>
        </SectionPanel>
      </div>
    );
  }

  const friendUids = await getFriendUids(uid);
  const friendsRaw = await Promise.all(friendUids.map((u) => getUser(u)));
  const friends: User[] = friendsRaw.filter((u): u is User => u !== null);

  const isSelf = uid === me.uid;
  const mutual = isSelf ? 0 : await getMutualFriendCount(me.uid, uid);

  return (
    <div>
      <SubNav active="friends" />
      <header className="mb-4">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-app-text-primary">
          {isSelf ? "My friends" : `${owner.displayName}’s friends`}
        </h1>
        <p className="mt-0.5 text-sm text-app-text-secondary">
          <span className="font-medium text-app-text-primary">
            {friends.length}
          </span>{" "}
          {friends.length === 1 ? "friend" : "friends"}
          {!isSelf ? (
            <>
              {" · "}
              <span className="text-app-text-tertiary">{mutual} mutual</span>
            </>
          ) : null}
        </p>
      </header>

      <SectionPanel title="Network" flush>
        {friends.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-app-text-secondary">
            No friends yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-3 md:grid-cols-4">
            {friends.map((f) => (
              <UserCard key={f.uid} user={f} />
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
