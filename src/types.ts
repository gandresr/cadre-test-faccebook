/**
 * Shared domain types for the cadre-test social network.
 * Source of truth: docs/data-model.md.
 *
 * Timestamps cross the RSC → client boundary as ISO-8601 strings. The
 * Firestore converters in `src/lib/firestore.ts` normalize `Timestamp`
 * values to ISO on read and coerce ISO / `FieldValue` sentinels back to
 * `Timestamp` on write. Server sentinels (`FieldValue.serverTimestamp()`)
 * are intentionally typed loosely on writes; reads always materialize as
 * ISO strings.
 */

// ── users ──────────────────────────────────────────────────────────────────

export type Sex = "male" | "female" | "other";

export type RelationshipStatus =
  | "single"
  | "in_relationship"
  | "engaged"
  | "married"
  | "its_complicated";

export type InterestedIn = "men" | "women" | "both";

export type LookingFor =
  | "friendship"
  | "dating"
  | "random_play"
  | "whatever_i_can_get";

export interface UserBasic {
  sex: Sex | null;
  birthday: string | null; // ISO yyyy-mm-dd
  hometown: string | null;
  currentResidence: string | null;
  phone: string | null;
  aim: string | null;
  website: string | null;
}

export interface UserAcademic {
  classYear: number | null;
  concentration: string | null;
  highSchool: string | null;
  courses: string[];
}

export interface UserSocial {
  relationshipStatus: RelationshipStatus | null;
  interestedIn: InterestedIn | null;
  lookingFor: LookingFor[];
  politicalViews: string | null;
  religiousViews: string | null;
}

export interface UserFavorites {
  books: string | null;
  movies: string | null;
  music: string | null;
  tv: string | null;
  quotes: string | null;
}

export interface UserCounts {
  friends: number;
  wallPosts: number;
  pokesReceived: number;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  status: string | null;
  network: string | null;
  basic: UserBasic;
  academic: UserAcademic;
  social: UserSocial;
  favorites: UserFavorites;
  aboutMe: string | null;
  displayNameLower: string;
  nameTokens: string[];
  counts: UserCounts;
}

// ── wallPosts ──────────────────────────────────────────────────────────────

export interface WallPost {
  id: string;
  wallOwnerUid: string;
  authorUid: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  text: string;
  createdAt: string; // ISO
  deletedAt: string | null; // ISO or null
}

// ── friendships ────────────────────────────────────────────────────────────

export interface Friendship {
  id: string; // = `${minUid}_${maxUid}`
  /** = min(uidA, uidB) */
  userA: string;
  /** = max(uidA, uidB) */
  userB: string;
  since: string; // ISO
}

// ── friendRequests ─────────────────────────────────────────────────────────

export interface FriendRequest {
  id: string; // = `${fromUid}_${toUid}`
  fromUid: string;
  toUid: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;
  createdAt: string; // ISO
  message: string | null;
}

// ── pokes ──────────────────────────────────────────────────────────────────

export interface Poke {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;
  toUid: string;
  createdAt: string; // ISO
  acknowledged: boolean;
}

// ── conversations / messages (P1) ──────────────────────────────────────────

export interface Conversation {
  id: string; // = `${minUid}_${maxUid}`
  participants: [string, string];
  lastMessageAt: string; // ISO
  lastMessageText: string;
  lastMessageFromUid: string;
  unread: Record<string, number>;
}

export interface Message {
  id: string;
  fromUid: string;
  text: string;
  createdAt: string; // ISO
  readBy: string[];
}

// ── groups (P2) ────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerUid: string;
  photoURL: string | null;
  createdAt: string; // ISO
  counts: { members: number; posts: number };
}

export type GroupRole = "admin" | "member";

export interface GroupMember {
  uid: string;
  joinedAt: string; // ISO
  role: GroupRole;
}
