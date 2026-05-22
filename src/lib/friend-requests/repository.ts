/**
 * Friend-requests repository — `friendRequests/{fromUid_toUid}` collection.
 *
 * Doc id is DIRECTED: `${fromUid}_${toUid}`. A→B and B→A are independent
 * docs; this gives free uniqueness per direction and O(1) keyed lookups.
 *
 * `acceptFriendRequest` runs transactionally with the `friendships` doc and
 * both users' counters: delete the request, create the friendship, increment
 * `users.counts.friends` on both sides — all-or-nothing.
 */

import "server-only";

import { FieldValue, type Transaction } from "firebase-admin/firestore";

import type { FriendRequest, User } from "@/src/types";
import {
  friendRequestsCol,
  friendshipsCol,
  pairId,
  usersCol,
} from "@/src/lib/firestore";

function directedId(fromUid: string, toUid: string): string {
  return `${fromUid}_${toUid}`;
}

// ── send ───────────────────────────────────────────────────────────────────

export async function sendFriendRequest(opts: {
  fromUid: string;
  toUid: string;
  message?: string;
}): Promise<FriendRequest> {
  const { fromUid, toUid, message } = opts;
  if (!fromUid) throw new Error(`[friendRequests.send] fromUid is required`);
  if (!toUid) throw new Error(`[friendRequests.send] toUid is required`);
  if (fromUid === toUid) {
    throw new Error(
      `[friendRequests.send] cannot friend yourself (${fromUid})`,
    );
  }
  if (message !== undefined) {
    if (typeof message !== "string" || message.length > 280) {
      throw new Error(
        `[friendRequests.send] message must be a string <= 280 chars`,
      );
    }
  }

  const reqRef = friendRequestsCol().doc(directedId(fromUid, toUid));
  const friendshipRef = friendshipsCol().doc(pairId(fromUid, toUid));
  const fromUserRef = usersCol().doc(fromUid);
  const toUserRef = usersCol().doc(toUid);

  await reqRef.firestore.runTransaction(async (tx: Transaction) => {
    const [reqSnap, friendshipSnap, fromSnap, toSnap] = await Promise.all([
      tx.get(reqRef),
      tx.get(friendshipRef),
      tx.get(fromUserRef),
      tx.get(toUserRef),
    ]);
    if (!fromSnap.exists) {
      throw new Error(`[friendRequests.send] sender ${fromUid} not found`);
    }
    if (!toSnap.exists) {
      throw new Error(`[friendRequests.send] recipient ${toUid} not found`);
    }
    if (friendshipSnap.exists) {
      throw new Error(
        `[friendRequests.send] users ${fromUid} and ${toUid} are already friends`,
      );
    }
    if (reqSnap.exists) {
      throw new Error(
        `[friendRequests.send] request from ${fromUid} to ${toUid} already pending`,
      );
    }
    const from = fromSnap.data() as User;
    tx.set(reqRef, {
      fromUid,
      toUid,
      fromDisplayName: from.displayName,
      fromPhotoURL: from.photoURL,
      createdAt: FieldValue.serverTimestamp(),
      message: message ?? null,
    } as unknown as FriendRequest);
  });

  const after = await reqRef.get();
  const data = after.data();
  if (!data) {
    throw new Error(
      `[friendRequests.send] wrote ${reqRef.id} but read-back returned no data`,
    );
  }
  return data;
}

// ── list ───────────────────────────────────────────────────────────────────

export async function listIncomingRequests(
  toUid: string,
): Promise<FriendRequest[]> {
  if (!toUid)
    throw new Error(`[friendRequests.listIncoming] toUid is required`);
  const snap = await friendRequestsCol()
    .where("toUid", "==", toUid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => d.data());
}

export async function listOutgoingRequests(
  fromUid: string,
): Promise<FriendRequest[]> {
  if (!fromUid)
    throw new Error(`[friendRequests.listOutgoing] fromUid is required`);
  const snap = await friendRequestsCol()
    .where("fromUid", "==", fromUid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => d.data());
}

/** Cheap "is there a pending request from A → B?" check (doc-key lookup). */
export async function hasPendingRequest(
  fromUid: string,
  toUid: string,
): Promise<boolean> {
  if (!fromUid || !toUid || fromUid === toUid) return false;
  const snap = await friendRequestsCol().doc(directedId(fromUid, toUid)).get();
  return snap.exists;
}

// ── accept / reject / withdraw ─────────────────────────────────────────────

/**
 * Accept a pending request by its directed id. The accepter must be the
 * request's `toUid`. Transactional: delete request, create friendship doc,
 * increment both users' `counts.friends`.
 */
export async function acceptFriendRequest(
  id: string,
  accepterUid: string,
): Promise<void> {
  if (!id) throw new Error(`[friendRequests.accept] id is required`);
  if (!accepterUid)
    throw new Error(`[friendRequests.accept] accepterUid is required`);

  const reqRef = friendRequestsCol().doc(id);

  await reqRef.firestore.runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) {
      throw new Error(`[friendRequests.accept] request ${id} not found`);
    }
    const req = reqSnap.data();
    if (!req) {
      throw new Error(`[friendRequests.accept] request ${id} has no data`);
    }
    if (req.toUid !== accepterUid) {
      throw new Error(
        `[friendRequests.accept] ${accepterUid} is not the recipient of request ${id}; cannot accept`,
      );
    }

    const { fromUid, toUid } = req;
    const friendshipRef = friendshipsCol().doc(pairId(fromUid, toUid));
    const fromUserRef = usersCol().doc(fromUid);
    const toUserRef = usersCol().doc(toUid);

    const [friendshipSnap, fromSnap, toSnap] = await Promise.all([
      tx.get(friendshipRef),
      tx.get(fromUserRef),
      tx.get(toUserRef),
    ]);
    if (!fromSnap.exists)
      throw new Error(`[friendRequests.accept] user ${fromUid} not found`);
    if (!toSnap.exists)
      throw new Error(`[friendRequests.accept] user ${toUid} not found`);
    if (friendshipSnap.exists) {
      tx.delete(reqRef);
      throw new Error(
        `[friendRequests.accept] users ${fromUid} and ${toUid} are already friends; stale request deleted`,
      );
    }

    const [a, b] = fromUid < toUid ? [fromUid, toUid] : [toUid, fromUid];
    tx.delete(reqRef);
    tx.set(friendshipRef, {
      userA: a,
      userB: b,
      since: FieldValue.serverTimestamp(),
    });
    tx.update(fromUserRef, { "counts.friends": FieldValue.increment(1) });
    tx.update(toUserRef, { "counts.friends": FieldValue.increment(1) });
  });
}

/** Reject a pending request: the recipient deletes it. */
export async function rejectFriendRequest(
  id: string,
  rejecterUid: string,
): Promise<void> {
  if (!id) throw new Error(`[friendRequests.reject] id is required`);
  if (!rejecterUid)
    throw new Error(`[friendRequests.reject] rejecterUid is required`);
  const reqRef = friendRequestsCol().doc(id);
  await reqRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) {
      throw new Error(`[friendRequests.reject] request ${id} not found`);
    }
    const req = snap.data();
    if (!req) {
      throw new Error(`[friendRequests.reject] request ${id} has no data`);
    }
    if (req.toUid !== rejecterUid) {
      throw new Error(
        `[friendRequests.reject] ${rejecterUid} is not the recipient of request ${id}; cannot reject`,
      );
    }
    tx.delete(reqRef);
  });
}

/** Withdraw an outgoing request: the sender deletes it. */
export async function withdrawFriendRequest(
  id: string,
  requesterUid: string,
): Promise<void> {
  if (!id) throw new Error(`[friendRequests.withdraw] id is required`);
  if (!requesterUid)
    throw new Error(`[friendRequests.withdraw] requesterUid is required`);
  const reqRef = friendRequestsCol().doc(id);
  await reqRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) {
      throw new Error(`[friendRequests.withdraw] request ${id} not found`);
    }
    const req = snap.data();
    if (!req) {
      throw new Error(`[friendRequests.withdraw] request ${id} has no data`);
    }
    if (req.fromUid !== requesterUid) {
      throw new Error(
        `[friendRequests.withdraw] ${requesterUid} is not the sender of request ${id}; cannot withdraw`,
      );
    }
    tx.delete(reqRef);
  });
}
