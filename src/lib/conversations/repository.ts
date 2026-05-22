/**
 * Conversations + messages repository (P1).
 *
 *   conversations/{convId}                    convId = `${minUid}_${maxUid}`
 *   conversations/{convId}/messages/{msgId}   auto-id
 *
 * Authorization: every read/write requires the caller to be one of the two
 * `participants`. Repo functions throw on forbidden / missing — the API
 * handlers' `mapRepoError` maps those to 403 / 404.
 */

import "server-only";

import { FieldValue, type Transaction } from "firebase-admin/firestore";

import type { Conversation, Message } from "@/src/types";
import {
  conversationsCol,
  db,
  messagesCol,
  pairId,
  usersCol,
} from "@/src/lib/firestore";

// ── ensure / list ──────────────────────────────────────────────────────────

/**
 * Idempotent: returns the convId for the 1:1 conversation between `a` and
 * `b`, creating the doc if it doesn't exist. Both users must exist in the
 * `users` collection.
 */
export async function ensureConversation(
  a: string,
  b: string,
): Promise<string> {
  if (!a) throw new Error(`[conversations.ensure] uid 'a' is required`);
  if (!b) throw new Error(`[conversations.ensure] uid 'b' is required`);
  if (a === b) {
    throw new Error(`[conversations.ensure] cannot DM yourself (${a})`);
  }
  const convId = pairId(a, b);
  const ref = conversationsCol().doc(convId);

  await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    if (snap.exists) return;
    const [aSnap, bSnap] = await Promise.all([
      tx.get(usersCol().doc(a)),
      tx.get(usersCol().doc(b)),
    ]);
    if (!aSnap.exists) {
      throw new Error(`[conversations.ensure] user ${a} not found`);
    }
    if (!bSnap.exists) {
      throw new Error(`[conversations.ensure] user ${b} not found`);
    }
    const [first, second] = a < b ? [a, b] : [b, a];
    tx.set(ref, {
      participants: [first, second],
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageText: "",
      lastMessageFromUid: "",
      unread: { [first]: 0, [second]: 0 },
    } as unknown as Conversation);
  });

  return convId;
}

/**
 * List the caller's conversations, newest activity first. Filters
 * server-side by `participants array-contains` to enforce membership.
 */
export async function listConversationsFor(
  uid: string,
  limit: number = 50,
): Promise<Conversation[]> {
  if (!uid) throw new Error(`[conversations.list] uid is required`);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error(
      `[conversations.list] limit must be an integer in [1,500]; got ${limit}`,
    );
  }
  // No `orderBy` — array-contains paired with orderBy on a different field
  // would force a composite index. Sort + slice in JS.
  const snap = await conversationsCol()
    .where("participants", "array-contains", uid)
    .get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
    .slice(0, limit);
}

// ── single conversation / messages ─────────────────────────────────────────

async function readConversationAuthorized(
  convId: string,
  requesterUid: string,
): Promise<Conversation> {
  if (!convId) throw new Error(`[conversations.get] convId is required`);
  if (!requesterUid)
    throw new Error(`[conversations.get] requesterUid is required`);
  const snap = await conversationsCol().doc(convId).get();
  if (!snap.exists) {
    throw new Error(`[conversations.get] conversation ${convId} not found`);
  }
  const conv = snap.data();
  if (!conv) {
    throw new Error(`[conversations.get] conversation ${convId} has no data`);
  }
  if (!conv.participants.includes(requesterUid)) {
    throw new Error(
      `[conversations.get] user ${requesterUid} is not a participant of ${convId}; forbidden`,
    );
  }
  return conv;
}

/** Get one conversation, gated by membership. Throws not-found / forbidden. */
export async function getConversation(opts: {
  convId: string;
  requesterUid: string;
}): Promise<Conversation> {
  return readConversationAuthorized(opts.convId, opts.requesterUid);
}

/**
 * List messages in a conversation, oldest-first (chronological thread view).
 * Caller must be a participant.
 */
export async function listMessages(opts: {
  convId: string;
  requesterUid: string;
  limit?: number;
}): Promise<Message[]> {
  const limit = opts.limit ?? 200;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error(
      `[conversations.listMessages] limit must be an integer in [1,1000]; got ${limit}`,
    );
  }
  await readConversationAuthorized(opts.convId, opts.requesterUid);
  const snap = await messagesCol(opts.convId)
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data());
}

/**
 * Append a message. Transactionally writes the message doc, updates the
 * conversation's `last*` fields, and increments the recipient's unread.
 */
export async function sendMessage(opts: {
  convId: string;
  fromUid: string;
  text: string;
}): Promise<Message> {
  const { convId, fromUid } = opts;
  if (!convId) throw new Error(`[conversations.send] convId is required`);
  if (!fromUid) throw new Error(`[conversations.send] fromUid is required`);
  const text = typeof opts.text === "string" ? opts.text.trim() : "";
  if (text.length === 0) {
    throw new Error(`[conversations.send] text must be 1-2000 chars; got 0`);
  }
  if (text.length > 2000) {
    throw new Error(
      `[conversations.send] text must be 1-2000 chars; got ${text.length}`,
    );
  }

  const convRef = conversationsCol().doc(convId);
  const msgRef = messagesCol(convId).doc();

  await db.runTransaction(async (tx) => {
    const convSnap = await tx.get(convRef);
    if (!convSnap.exists) {
      throw new Error(`[conversations.send] conversation ${convId} not found`);
    }
    const conv = convSnap.data();
    if (!conv) {
      throw new Error(
        `[conversations.send] conversation ${convId} has no data`,
      );
    }
    if (!conv.participants.includes(fromUid)) {
      throw new Error(
        `[conversations.send] user ${fromUid} is not a participant of ${convId}; forbidden`,
      );
    }
    const recipient = conv.participants.find((p) => p !== fromUid);
    if (!recipient) {
      throw new Error(
        `[conversations.send] conversation ${convId} has no other participant relative to ${fromUid}`,
      );
    }
    tx.set(msgRef, {
      fromUid,
      text,
      createdAt: FieldValue.serverTimestamp(),
      readBy: [fromUid],
    } as unknown as Message);
    tx.update(convRef, {
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageText: text,
      lastMessageFromUid: fromUid,
      [`unread.${recipient}`]: FieldValue.increment(1),
    });
  });

  const after = await msgRef.get();
  const data = after.data();
  if (!data) {
    throw new Error(
      `[conversations.send] wrote message ${msgRef.id} but read-back returned no data`,
    );
  }
  return data;
}

/**
 * Clear the caller's unread counter on this conversation. Idempotent; does
 * not touch other participants' unread counts. Must be a participant.
 */
export async function markRead(opts: {
  convId: string;
  requesterUid: string;
}): Promise<void> {
  const { convId, requesterUid } = opts;
  await readConversationAuthorized(convId, requesterUid);
  await conversationsCol()
    .doc(convId)
    .update({ [`unread.${requesterUid}`]: 0 });
}
