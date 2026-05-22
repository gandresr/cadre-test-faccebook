/**
 * Wall posts domain — `wallPosts/{postId}` collection.
 *
 * Despite the file name `posts.ts` (mandated by plan.md), this module speaks
 * strictly in *wall posts*. There is no `posts` collection.
 */

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import type { WallPost } from "@/src/types";
import {
  NotAuthorizedError,
  UserNotFoundError,
  ValidationError,
  WallPostNotFoundError,
} from "@/src/lib/errors";
import {
  friendshipsCol,
  pairId,
  usersCol,
  wallPostsCol,
} from "@/src/lib/firestore";

// ── validation ─────────────────────────────────────────────────────────────

const TEXT_MAX = 500;

export function validateWallPostText(input: unknown): string {
  if (typeof input !== "string") {
    throw new ValidationError(
      `Wall post text must be a string; got ${typeof input}`,
    );
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(
      `Wall post text must be 1–${TEXT_MAX} characters after trim; got 0`,
    );
  }
  if (trimmed.length > TEXT_MAX) {
    throw new ValidationError(
      `Wall post text must be 1–${TEXT_MAX} characters; got ${trimmed.length}`,
    );
  }
  return trimmed;
}

const createSchema = z.object({
  authorUid: z.string().min(1),
  wallOwnerUid: z.string().min(1),
  text: z.string(),
});

export interface CreateWallPostInput {
  authorUid: string;
  wallOwnerUid: string;
  text: string;
}

// ── create ─────────────────────────────────────────────────────────────────

/**
 * Create a wall post. Friendship-gated unless authoring on one's own wall.
 *
 * @returns the newly created post id.
 */
export async function createWallPost(
  input: CreateWallPostInput,
): Promise<string> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new ValidationError(`createWallPost: ${issues}`);
  }
  const { authorUid, wallOwnerUid } = parsed.data;
  const text = validateWallPostText(parsed.data.text);

  const postRef = wallPostsCol().doc();
  const ownerRef = usersCol().doc(wallOwnerUid);
  const authorRef = usersCol().doc(authorUid);
  const friendshipRef =
    authorUid === wallOwnerUid
      ? null
      : friendshipsCol().doc(pairId(authorUid, wallOwnerUid));

  await postRef.firestore.runTransaction(async (tx) => {
    const [ownerSnap, authorSnap, friendshipSnap] = await Promise.all([
      tx.get(ownerRef),
      tx.get(authorRef),
      friendshipRef ? tx.get(friendshipRef) : Promise.resolve(null),
    ]);

    if (!ownerSnap.exists) {
      throw new UserNotFoundError(`Wall owner ${wallOwnerUid} not found`);
    }
    if (!authorSnap.exists) {
      throw new UserNotFoundError(`Author ${authorUid} not found`);
    }
    if (friendshipRef && !friendshipSnap?.exists) {
      throw new NotAuthorizedError(
        `User ${authorUid} is not a friend of ${wallOwnerUid}; cannot post on their wall`,
      );
    }

    const author = authorSnap.data();
    if (!author) {
      throw new UserNotFoundError(`Author ${authorUid} has no data`);
    }

    tx.set(postRef, {
      id: postRef.id,
      wallOwnerUid,
      authorUid,
      authorDisplayName: author.displayName,
      authorPhotoURL: author.photoURL,
      text,
      createdAt: FieldValue.serverTimestamp(),
      deletedAt: null,
    } as unknown as WallPost);
    tx.update(ownerRef, { "counts.wallPosts": FieldValue.increment(1) });
  });

  return postRef.id;
}

// ── reads ──────────────────────────────────────────────────────────────────

/**
 * List posts on `uid`'s wall (most recent first, soft-deletes excluded).
 */
export async function listWall(
  uid: string,
  limit: number = 50,
): Promise<WallPost[]> {
  if (typeof uid !== "string" || uid.length === 0) {
    throw new ValidationError(`listWall: 'uid' is required`);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new ValidationError(
      `listWall: 'limit' must be an integer in [1,200]; got ${limit}`,
    );
  }
  const snap = await wallPostsCol()
    .where("wallOwnerUid", "==", uid)
    .where("deletedAt", "==", null)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data());
}

/**
 * Landing-feed query: posts on any of `uid`'s friends' walls (plus the
 * caller's own wall), most recent first.
 */
export async function listFriendActivityFeed(
  uid: string,
  friendUids: string[],
  limit: number = 50,
): Promise<WallPost[]> {
  if (typeof uid !== "string" || uid.length === 0) {
    throw new ValidationError(`listFriendActivityFeed: 'uid' is required`);
  }
  if (!Array.isArray(friendUids)) {
    throw new ValidationError(
      `listFriendActivityFeed: 'friendUids' must be an array`,
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new ValidationError(
      `listFriendActivityFeed: 'limit' must be an integer in [1,200]; got ${limit}`,
    );
  }

  const wallOwners = [...new Set([uid, ...friendUids])];
  if (wallOwners.length === 0) return [];

  const batches: string[][] = [];
  const BATCH = 30; // Firestore `in` cap
  for (let i = 0; i < wallOwners.length; i += BATCH) {
    batches.push(wallOwners.slice(i, i + BATCH));
  }

  const col = wallPostsCol();
  const snaps = await Promise.all(
    batches.map((b) =>
      col
        .where("wallOwnerUid", "in", b)
        .where("deletedAt", "==", null)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get(),
    ),
  );

  const merged = snaps.flatMap((s) => s.docs.map((d) => d.data()));
  const byId = new Map<string, WallPost>();
  for (const p of merged) byId.set(p.id, p);

  // ISO-8601 sorts lexicographically the same as chronologically.
  const sorted = [...byId.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return sorted.slice(0, limit);
}

// ── delete (soft) ──────────────────────────────────────────────────────────

/**
 * Soft-delete a wall post by setting `deletedAt`. Only the author may delete.
 */
export async function deleteWallPost(
  postId: string,
  callerUid: string,
): Promise<void> {
  if (typeof postId !== "string" || postId.length === 0) {
    throw new ValidationError(`deleteWallPost: 'postId' is required`);
  }
  if (typeof callerUid !== "string" || callerUid.length === 0) {
    throw new ValidationError(`deleteWallPost: 'callerUid' is required`);
  }
  const postRef = wallPostsCol().doc(postId);
  await postRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists) {
      throw new WallPostNotFoundError(`Wall post ${postId} not found`);
    }
    const post = snap.data();
    if (!post) {
      throw new WallPostNotFoundError(`Wall post ${postId} has no data`);
    }
    if (post.deletedAt !== null) {
      throw new WallPostNotFoundError(`Wall post ${postId} is already deleted`);
    }
    if (post.authorUid !== callerUid) {
      throw new NotAuthorizedError(
        `User ${callerUid} is not the author of post ${postId}; cannot delete`,
      );
    }
    const ownerRef = usersCol().doc(post.wallOwnerUid);
    tx.update(postRef, { deletedAt: FieldValue.serverTimestamp() });
    tx.update(ownerRef, { "counts.wallPosts": FieldValue.increment(-1) });
  });
}
