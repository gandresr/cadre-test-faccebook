/**
 * Per-domain wall-posts repository facade. Wraps the flat
 * `src/lib/posts.ts` module so pages can import from the
 * `@/src/lib/wall-posts/repository` path used across the app.
 *
 * The only behavior change vs. the flat module: `listFriendActivityFeed`
 * here is 2-arg `(uid, limit?)`. The flat module takes the friend uids
 * explicitly; this wrapper resolves them from the `friendships` collection
 * first, then delegates.
 */

import "server-only";

import type { Friendship, WallPost } from "@/src/types";
import { friendshipsCol } from "@/src/lib/firestore";

import {
  createWallPost,
  deleteWallPost,
  listWall,
  listFriendActivityFeed as listFeedRaw,
  validateWallPostText,
} from "@/src/lib/posts";

export { createWallPost, deleteWallPost, listWall, validateWallPostText };
export type { CreateWallPostInput } from "@/src/lib/posts";

/**
 * Resolve `uid`'s friend uids from the `friendships` collection. Two queries
 * (userA == uid, userB == uid), merged + deduped by the *other* uid.
 */
async function listFriendUids(uid: string): Promise<string[]> {
  const col = friendshipsCol();
  const [aSnap, bSnap] = await Promise.all([
    col.where("userA", "==", uid).get(),
    col.where("userB", "==", uid).get(),
  ]);
  const out = new Set<string>();
  for (const d of aSnap.docs) out.add((d.data() as Friendship).userB);
  for (const d of bSnap.docs) out.add((d.data() as Friendship).userA);
  return [...out];
}

/**
 * Landing feed: wall posts on any of `uid`'s friends' walls plus their own.
 * Pulls the friend list, then delegates to the flat repo which knows how to
 * batch the `in` query for >30 friends.
 */
export async function listFriendActivityFeed(
  uid: string,
  limit: number = 50,
): Promise<WallPost[]> {
  const friendUids = await listFriendUids(uid);
  return listFeedRaw(uid, friendUids, limit);
}
