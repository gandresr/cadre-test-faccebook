/**
 * Friendships repository — `friendships/{minUid_maxUid}` collection.
 *
 * Sorted-pair doc id, one row per friendship. Counts (`users.counts.friends`)
 * are kept in sync by this module: `acceptFriendRequest` increments (lives in
 * `friend-requests/repository.ts`); `unfriend` decrements.
 */

import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { Friendship } from "@/src/types";
import { friendshipsCol, pairId, usersCol } from "@/src/lib/firestore";

// ── reads ──────────────────────────────────────────────────────────────────

export async function listFriends(uid: string): Promise<string[]> {
  if (!uid) throw new Error(`[friendships.listFriends] uid is required`);
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

/** Alias — frontend pages import this name from the per-domain path. */
export const getFriendUids = listFriends;

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (!a || !b) {
    throw new Error(`[friendships.areFriends] both uids are required`);
  }
  if (a === b) return false;
  const snap = await friendshipsCol().doc(pairId(a, b)).get();
  return snap.exists;
}

export async function getMutualFriendCount(
  a: string,
  b: string,
): Promise<number> {
  if (a === b) return 0;
  const [fa, fb] = await Promise.all([listFriends(a), listFriends(b)]);
  const setA = new Set(fa);
  let count = 0;
  for (const x of fb) if (setA.has(x)) count++;
  return count;
}

// ── writes ─────────────────────────────────────────────────────────────────

/**
 * Unfriend (a, b). Either party may call. Decrements both counters.
 * Throws `[friendships.unfriend] no friendship between ${a} and ${b}` if missing.
 */
export async function unfriend(a: string, b: string): Promise<void> {
  if (!a || !b) {
    throw new Error(`[friendships.unfriend] both uids are required`);
  }
  if (a === b) {
    throw new Error(`[friendships.unfriend] cannot unfriend yourself (${a})`);
  }
  const ref = friendshipsCol().doc(pairId(a, b));
  const aRef = usersCol().doc(a);
  const bRef = usersCol().doc(b);

  await ref.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error(
        `[friendships.unfriend] no friendship between ${a} and ${b} not found`,
      );
    }
    tx.delete(ref);
    tx.update(aRef, { "counts.friends": FieldValue.increment(-1) });
    tx.update(bRef, { "counts.friends": FieldValue.increment(-1) });
  });
}
