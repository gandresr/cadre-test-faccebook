import Link from "next/link";
import type { User } from "@/src/lib/types";
import { openConversationAction } from "@/app/_actions/open-conversation";
import { FriendButton } from "./FriendButton";
import { PokeButton } from "./PokeButton";

/**
 * Profile photo card with identity + action buttons. Sits in the left column
 * of /profile/[uid]. Buttons are only shown when viewing someone else.
 */
export function ProfileSidebar({
  user,
  viewingAs,
  isFriend,
  hasOutgoingRequest,
  hasIncomingRequest,
  mutualFriendCount,
}: {
  user: User;
  viewingAs: User;
  isFriend: boolean;
  hasOutgoingRequest: boolean;
  hasIncomingRequest: boolean;
  mutualFriendCount?: number;
}) {
  if (!user) {
    throw new Error("[ProfileSidebar] user prop is required");
  }
  if (!viewingAs) {
    throw new Error("[ProfileSidebar] viewingAs prop is required");
  }

  const isSelf = user.uid === viewingAs.uid;
  const firstName = user.displayName.split(/\s+/)[0] || user.displayName;
  const photo = user.photoURL ?? `https://i.pravatar.cc/150?u=${user.uid}`;

  let friendState: "none" | "sent" | "friends" | "incoming" = "none";
  if (isFriend) friendState = "friends";
  else if (hasOutgoingRequest) friendState = "sent";
  else if (hasIncomingRequest) friendState = "incoming";

  return (
    <aside className="border border-app-border bg-app-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt={user.displayName}
        width={200}
        height={200}
        className="block aspect-square w-full border-b border-app-border-subtle bg-app-surface-raised object-cover"
      />

      <div className="px-3 py-3">
        <div className="text-[13.5px] font-semibold leading-tight text-app-text-primary">
          {user.displayName}
        </div>
        {user.network ? (
          <div className="mt-0.5 text-[12px] italic text-app-text-tertiary">
            {user.network}
          </div>
        ) : null}

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 border-t border-app-border-subtle pt-3 text-[12px]">
          <dt className="text-app-text-tertiary">Friends</dt>
          <dd>
            <Link
              href={`/friends/${user.uid}`}
              className="text-app-brand hover:underline"
            >
              {user.counts.friends}
            </Link>
          </dd>
          {!isSelf && typeof mutualFriendCount === "number" ? (
            <>
              <dt className="text-app-text-tertiary">Mutual</dt>
              <dd className="text-app-text-secondary">{mutualFriendCount}</dd>
            </>
          ) : null}
          <dt className="text-app-text-tertiary">Wall</dt>
          <dd className="text-app-text-secondary">
            {user.counts.wallPosts}{" "}
            {user.counts.wallPosts === 1 ? "post" : "posts"}
          </dd>
        </dl>

        {!isSelf ? (
          <div className="mt-3 flex flex-col gap-1.5 border-t border-app-border-subtle pt-3">
            <FriendButton
              toUid={user.uid}
              viewerUid={viewingAs.uid}
              initialState={friendState}
            />
            <PokeButton toUid={user.uid} label={`Poke ${firstName}`} />
            <form action={openConversationAction}>
              <input type="hidden" name="otherUid" value={user.uid} />
              <button
                type="submit"
                className="block w-full border border-app-border bg-app-surface px-2 py-1.5 text-left text-[12px] text-app-text-primary transition-colors hover:border-app-brand hover:bg-app-surface-raised"
              >
                Send {firstName} a message
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-3 border-t border-app-border-subtle pt-3">
            <Link
              href="/profile/edit"
              className="block w-full bg-app-brand px-2 py-1.5 text-center text-[12px] font-medium text-white transition-colors hover:bg-app-brand-hover hover:no-underline"
            >
              Edit my profile
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
