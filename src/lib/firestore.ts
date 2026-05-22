/**
 * Firestore Admin SDK singleton + typed `FirestoreDataConverter<T>` for every
 * P0/P1 collection. All server-side data access flows through this module.
 *
 * Credentials use Google **Application Default Credentials (ADC)** —
 * `applicationDefault()` auto-discovers from (in order):
 *   1. `GOOGLE_APPLICATION_CREDENTIALS` env var (path to service-account JSON),
 *   2. `gcloud auth application-default login` user creds,
 *   3. The GCE/Cloud Run metadata server when deployed.
 * No env var is *required* locally — `gcloud auth application-default login`
 * is sufficient. `FIRESTORE_PROJECT_ID` is still required so the SDK knows
 * which project to talk to.
 *
 * Emulator mode: when `FIRESTORE_EMULATOR_HOST` is set, the underlying
 * `@google-cloud/firestore` client auto-targets the emulator and credentials
 * are unnecessary. We honor that by skipping the credential init in that case.
 *
 * Timestamp wire format: the converters normalize Firestore `Timestamp` to
 * ISO-8601 strings on read so the values survive the RSC → client boundary.
 * Writes accept ISO strings, `Timestamp` instances, or `FieldValue` sentinels
 * (e.g. `serverTimestamp()`).
 */

import {
  applicationDefault,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import type {
  Conversation,
  Friendship,
  FriendRequest,
  Message,
  Poke,
  User,
  WallPost,
} from "@/src/types";

// ── env helpers ────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(
      `Missing required env var: ${name}. Set it in .env.local (see .env.example).`,
    );
  }
  return v;
}

function isEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

// ── singleton init ─────────────────────────────────────────────────────────

function initAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  if (isEmulator()) {
    return initializeApp({
      projectId: process.env.FIRESTORE_PROJECT_ID ?? "cadre-test-emulator",
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: requireEnv("FIRESTORE_PROJECT_ID"),
  });
}

const app = initAdminApp();
export const db = getFirestore(app);

// ── collection name constants ──────────────────────────────────────────────

export const COLLECTIONS = {
  users: "users",
  wallPosts: "wallPosts",
  friendships: "friendships",
  friendRequests: "friendRequests",
  pokes: "pokes",
  conversations: "conversations",
} as const;

// ── timestamp helpers ──────────────────────────────────────────────────────

function tsToIso(t: unknown): string | null {
  if (t == null) return null;
  if (t instanceof Timestamp) return t.toDate().toISOString();
  if (
    typeof t === "object" &&
    t !== null &&
    "seconds" in (t as Record<string, unknown>) &&
    "nanoseconds" in (t as Record<string, unknown>)
  ) {
    const { seconds, nanoseconds } = t as {
      seconds: number;
      nanoseconds: number;
    };
    return new Date(seconds * 1000 + nanoseconds / 1e6).toISOString();
  }
  if (typeof t === "string") return t;
  throw new Error(
    `[firestore/tsToIso] expected Timestamp; got ${typeof t} ${JSON.stringify(t)}`,
  );
}

function isoToTs(v: unknown): unknown {
  if (v == null) return null;
  if (v instanceof Timestamp) return v;
  if (v instanceof FieldValue) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      throw new Error(
        `[firestore/isoToTs] invalid ISO timestamp: ${JSON.stringify(v)}`,
      );
    }
    return Timestamp.fromDate(d);
  }
  throw new Error(
    `[firestore/isoToTs] expected ISO string | Timestamp | FieldValue; got ${typeof v}`,
  );
}

function snapshotData(snap: QueryDocumentSnapshot<DocumentData>): DocumentData {
  return snap.data();
}

// ── converters ─────────────────────────────────────────────────────────────

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(u: User): DocumentData {
    return {
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      createdAt: isoToTs(u.createdAt),
      updatedAt: isoToTs(u.updatedAt),
      status: u.status,
      network: u.network,
      basic: u.basic,
      academic: u.academic,
      social: u.social,
      favorites: u.favorites,
      aboutMe: u.aboutMe,
      displayNameLower: u.displayNameLower,
      nameTokens: u.nameTokens,
      counts: u.counts,
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): User {
    const d = snapshotData(snap);
    const createdAtIso = tsToIso(d.createdAt);
    const updatedAtIso = tsToIso(d.updatedAt);
    if (!createdAtIso || !updatedAtIso) {
      throw new Error(
        `[userConverter] user ${snap.id} missing createdAt/updatedAt`,
      );
    }
    return {
      uid: snap.id,
      email: d.email,
      displayName: d.displayName,
      photoURL: d.photoURL ?? null,
      createdAt: createdAtIso,
      updatedAt: updatedAtIso,
      status: d.status ?? null,
      network: d.network ?? null,
      basic: d.basic,
      academic: d.academic,
      social: d.social,
      favorites: d.favorites,
      aboutMe: d.aboutMe ?? null,
      displayNameLower: d.displayNameLower,
      nameTokens: d.nameTokens ?? [],
      counts: d.counts,
    };
  },
};

export const wallPostConverter: FirestoreDataConverter<WallPost> = {
  toFirestore(p: WallPost): DocumentData {
    return {
      wallOwnerUid: p.wallOwnerUid,
      authorUid: p.authorUid,
      authorDisplayName: p.authorDisplayName,
      authorPhotoURL: p.authorPhotoURL,
      text: p.text,
      createdAt: isoToTs(p.createdAt),
      deletedAt: p.deletedAt == null ? null : isoToTs(p.deletedAt),
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): WallPost {
    const d = snapshotData(snap);
    const createdAtIso = tsToIso(d.createdAt);
    if (!createdAtIso) {
      throw new Error(`[wallPostConverter] post ${snap.id} missing createdAt`);
    }
    return {
      id: snap.id,
      wallOwnerUid: d.wallOwnerUid,
      authorUid: d.authorUid,
      authorDisplayName: d.authorDisplayName,
      authorPhotoURL: d.authorPhotoURL ?? null,
      text: d.text,
      createdAt: createdAtIso,
      deletedAt: tsToIso(d.deletedAt),
    };
  },
};

export const friendshipConverter: FirestoreDataConverter<Friendship> = {
  toFirestore(f: Friendship): DocumentData {
    return {
      userA: f.userA,
      userB: f.userB,
      since: isoToTs(f.since),
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): Friendship {
    const d = snapshotData(snap);
    const sinceIso = tsToIso(d.since);
    if (!sinceIso) {
      throw new Error(
        `[friendshipConverter] friendship ${snap.id} missing since`,
      );
    }
    return {
      id: snap.id,
      userA: d.userA,
      userB: d.userB,
      since: sinceIso,
    };
  },
};

export const friendRequestConverter: FirestoreDataConverter<FriendRequest> = {
  toFirestore(r: FriendRequest): DocumentData {
    return {
      fromUid: r.fromUid,
      toUid: r.toUid,
      fromDisplayName: r.fromDisplayName,
      fromPhotoURL: r.fromPhotoURL,
      createdAt: isoToTs(r.createdAt),
      message: r.message,
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): FriendRequest {
    const d = snapshotData(snap);
    const createdAtIso = tsToIso(d.createdAt);
    if (!createdAtIso) {
      throw new Error(
        `[friendRequestConverter] request ${snap.id} missing createdAt`,
      );
    }
    return {
      id: snap.id,
      fromUid: d.fromUid,
      toUid: d.toUid,
      fromDisplayName: d.fromDisplayName,
      fromPhotoURL: d.fromPhotoURL ?? null,
      createdAt: createdAtIso,
      message: d.message ?? null,
    };
  },
};

export const pokeConverter: FirestoreDataConverter<Poke> = {
  toFirestore(p: Poke): DocumentData {
    return {
      fromUid: p.fromUid,
      fromDisplayName: p.fromDisplayName,
      fromPhotoURL: p.fromPhotoURL,
      toUid: p.toUid,
      createdAt: isoToTs(p.createdAt),
      acknowledged: p.acknowledged,
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): Poke {
    const d = snapshotData(snap);
    const createdAtIso = tsToIso(d.createdAt);
    if (!createdAtIso) {
      throw new Error(`[pokeConverter] poke ${snap.id} missing createdAt`);
    }
    return {
      id: snap.id,
      fromUid: d.fromUid,
      fromDisplayName: d.fromDisplayName,
      fromPhotoURL: d.fromPhotoURL ?? null,
      toUid: d.toUid,
      createdAt: createdAtIso,
      acknowledged: Boolean(d.acknowledged),
    };
  },
};

export const conversationConverter: FirestoreDataConverter<Conversation> = {
  toFirestore(c: Conversation): DocumentData {
    return {
      participants: c.participants,
      lastMessageAt: isoToTs(c.lastMessageAt),
      lastMessageText: c.lastMessageText,
      lastMessageFromUid: c.lastMessageFromUid,
      unread: c.unread,
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): Conversation {
    const d = snapshotData(snap);
    const lastMessageAtIso = tsToIso(d.lastMessageAt);
    if (!lastMessageAtIso) {
      throw new Error(
        `[conversationConverter] conversation ${snap.id} missing lastMessageAt`,
      );
    }
    const participants = d.participants;
    if (
      !Array.isArray(participants) ||
      participants.length !== 2 ||
      typeof participants[0] !== "string" ||
      typeof participants[1] !== "string"
    ) {
      throw new Error(
        `[conversationConverter] conversation ${snap.id} has malformed participants: ${JSON.stringify(participants)}`,
      );
    }
    return {
      id: snap.id,
      participants: [participants[0], participants[1]],
      lastMessageAt: lastMessageAtIso,
      lastMessageText: d.lastMessageText ?? "",
      lastMessageFromUid: d.lastMessageFromUid ?? "",
      unread: (d.unread ?? {}) as Record<string, number>,
    };
  },
};

export const messageConverter: FirestoreDataConverter<Message> = {
  toFirestore(m: Message): DocumentData {
    return {
      fromUid: m.fromUid,
      text: m.text,
      createdAt: isoToTs(m.createdAt),
      readBy: m.readBy,
    };
  },
  fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): Message {
    const d = snapshotData(snap);
    const createdAtIso = tsToIso(d.createdAt);
    if (!createdAtIso) {
      throw new Error(
        `[messageConverter] message ${snap.id} missing createdAt`,
      );
    }
    return {
      id: snap.id,
      fromUid: d.fromUid,
      text: d.text,
      createdAt: createdAtIso,
      readBy: Array.isArray(d.readBy) ? d.readBy : [],
    };
  },
};

// ── typed collection refs ──────────────────────────────────────────────────

export const usersCol = () =>
  db.collection(COLLECTIONS.users).withConverter(userConverter);

export const wallPostsCol = () =>
  db.collection(COLLECTIONS.wallPosts).withConverter(wallPostConverter);

export const friendshipsCol = () =>
  db.collection(COLLECTIONS.friendships).withConverter(friendshipConverter);

export const friendRequestsCol = () =>
  db
    .collection(COLLECTIONS.friendRequests)
    .withConverter(friendRequestConverter);

export const pokesCol = () =>
  db.collection(COLLECTIONS.pokes).withConverter(pokeConverter);

export const conversationsCol = () =>
  db.collection(COLLECTIONS.conversations).withConverter(conversationConverter);

export const messagesCol = (convId: string) =>
  db
    .collection(COLLECTIONS.conversations)
    .doc(convId)
    .collection("messages")
    .withConverter(messageConverter);

// ── doc-id helpers ─────────────────────────────────────────────────────────

/** Sorted-pair doc ID: used for friendships and conversations. */
export function pairId(a: string, b: string): string {
  if (a === b) {
    throw new Error(`pairId requires two distinct uids; got '${a}' twice`);
  }
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** Directed pair doc ID: used for friendRequests (from → to). */
export function directedPairId(fromUid: string, toUid: string): string {
  if (fromUid === toUid) {
    throw new Error(
      `directedPairId requires distinct uids; got '${fromUid}' twice`,
    );
  }
  return `${fromUid}_${toUid}`;
}
