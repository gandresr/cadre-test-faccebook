/**
 * Users domain — Firestore reads/writes for the `users/{uid}` collection.
 *
 * - `uid` = Auth0 `sub` with every `|` replaced by `_` (see sanitizeAuthSub).
 * - On upsert from an Auth0 session we (re-)derive `displayNameLower` and
 *   `nameTokens` (lowercased prefix tokens for array-contains search).
 * - All boundary inputs are zod-validated; failures throw `ValidationError`
 *   with a message that names the offending field.
 */

import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";

import type { User } from "@/src/types";
import { UserNotFoundError, ValidationError } from "@/src/lib/errors";
import { usersCol } from "@/src/lib/firestore";

// ── primitives ─────────────────────────────────────────────────────────────

/**
 * Convert an Auth0 `sub` claim into a Firestore-safe uid.
 *
 * Auth0 subs look like `google-oauth2|1234567890`. We replace every `|` with
 * `_` to keep IDs URL-safe and visually consistent across the codebase.
 *
 * @throws ValidationError if `sub` is empty.
 */
export function sanitizeAuthSub(sub: string): string {
  if (typeof sub !== "string" || sub.length === 0) {
    throw new ValidationError(
      `sanitizeAuthSub: 'sub' must be a non-empty string; got ${JSON.stringify(sub)}`,
    );
  }
  return sub.replace(/\|/g, "_");
}

const TOKEN_MAX_PREFIX_LEN = 16;

/**
 * Derive lowercased prefix tokens for array-contains search.
 *
 * For each whitespace-delimited token (≥2 chars), emit every prefix from
 * length 2 up to min(token.length, TOKEN_MAX_PREFIX_LEN). Output is deduped
 * and sorted for stable diffs.
 */
export function nameTokensFor(displayName: string): string[] {
  if (typeof displayName !== "string") return [];
  const tokens = displayName
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const out = new Set<string>();
  for (const t of tokens) {
    const maxLen = Math.min(t.length, TOKEN_MAX_PREFIX_LEN);
    for (let n = 2; n <= maxLen; n++) {
      out.add(t.slice(0, n));
    }
  }
  return [...out].sort();
}

// ── upsert from Auth0 session ──────────────────────────────────────────────

const upsertSessionSchema = z.object({
  sub: z.string().min(1, "Auth0 session 'sub' is required"),
  email: z.string().email("Auth0 session 'email' must be a valid email"),
  name: z
    .string()
    .min(1, "Auth0 session 'name' (displayName) must be 1–80 chars")
    .max(80, "Auth0 session 'name' (displayName) must be 1–80 chars"),
  picture: z.string().url().nullable().optional(),
});

export type UpsertUserInput = z.input<typeof upsertSessionSchema>;

const EMPTY_BASIC: User["basic"] = {
  sex: null,
  birthday: null,
  hometown: null,
  currentResidence: null,
  phone: null,
  aim: null,
  website: null,
};

const EMPTY_ACADEMIC: User["academic"] = {
  classYear: null,
  concentration: null,
  highSchool: null,
  courses: [],
};

const EMPTY_SOCIAL: User["social"] = {
  relationshipStatus: null,
  interestedIn: null,
  lookingFor: [],
  politicalViews: null,
  religiousViews: null,
};

const EMPTY_FAVORITES: User["favorites"] = {
  books: null,
  movies: null,
  music: null,
  tv: null,
  quotes: null,
};

/**
 * Create-or-update a user document from the authenticated Auth0 session.
 *
 * @returns the sanitized uid that was written.
 */
export async function upsertUserFromSession(
  raw: UpsertUserInput,
): Promise<string> {
  const parsed = upsertSessionSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new ValidationError(`upsertUserFromSession: ${issues}`);
  }
  const { sub, email, name, picture } = parsed.data;
  const uid = sanitizeAuthSub(sub);
  const photoURL = picture ?? null;
  const displayNameLower = name.toLowerCase();
  const nameTokens = nameTokensFor(name);

  const ref = usersCol().doc(uid);
  const now = FieldValue.serverTimestamp();

  await ref.firestore.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, {
        email,
        displayName: name,
        photoURL,
        createdAt: now,
        updatedAt: now,
        status: null,
        network: null,
        basic: EMPTY_BASIC,
        academic: EMPTY_ACADEMIC,
        social: EMPTY_SOCIAL,
        favorites: EMPTY_FAVORITES,
        aboutMe: null,
        displayNameLower,
        nameTokens,
        counts: { friends: 0, wallPosts: 0, pokesReceived: 0 },
      } as unknown as User);
      return;
    }
    tx.update(ref, {
      email,
      displayName: name,
      photoURL,
      displayNameLower,
      nameTokens,
      updatedAt: now,
    });
  });

  return uid;
}

// ── reads ──────────────────────────────────────────────────────────────────

/** Fetch a user by uid. Throws `UserNotFoundError` (404) if absent. */
export async function getUser(uid: string): Promise<User> {
  if (!uid) {
    throw new ValidationError("getUser: 'uid' is required");
  }
  const snap = await usersCol().doc(uid).get();
  if (!snap.exists) {
    throw new UserNotFoundError(`User ${uid} not found`);
  }
  const data = snap.data();
  if (!data) {
    throw new UserNotFoundError(`User ${uid} exists but has no data`);
  }
  return data;
}

/**
 * Non-throwing variant of `getUser` — returns `null` if the doc is missing.
 */
export async function tryGetUser(uid: string): Promise<User | null> {
  if (!uid) {
    throw new ValidationError("tryGetUser: 'uid' is required");
  }
  const snap = await usersCol().doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() ?? null;
}

/**
 * Batch-fetch users by uid, dropping missing rows.
 */
export async function getUsersByIds(uids: string[]): Promise<User[]> {
  if (!Array.isArray(uids)) {
    throw new ValidationError(
      `getUsersByIds: 'uids' must be an array; got ${typeof uids}`,
    );
  }
  if (uids.length === 0) return [];
  const snaps = await Promise.all(uids.map((uid) => usersCol().doc(uid).get()));
  const out: User[] = [];
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const data = snap.data();
    if (data) out.push(data);
  }
  return out;
}

/** Prefix-search users by displayName. */
export async function searchUsersByName(
  prefix: string,
  limit: number = 10,
): Promise<User[]> {
  if (typeof prefix !== "string" || prefix.trim().length < 2) {
    throw new ValidationError(
      `searchUsersByName: 'prefix' must be at least 2 chars after trim; got ${JSON.stringify(prefix)}`,
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ValidationError(
      `searchUsersByName: 'limit' must be an integer in [1,50]; got ${limit}`,
    );
  }
  const token = prefix.trim().toLowerCase().split(/\s+/)[0].slice(0, 16);
  const snap = await usersCol()
    .where("nameTokens", "array-contains", token)
    .orderBy("displayNameLower")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data());
}

// ── registration (signup form → API → Firestore) ──────────────────────────

const SEX_VALUES = ["male", "female", "other"] as const;
const RELATIONSHIP_VALUES = [
  "single",
  "in_relationship",
  "engaged",
  "married",
  "its_complicated",
] as const;
const INTERESTED_IN_VALUES = ["men", "women", "both"] as const;
const LOOKING_FOR_VALUES = [
  "friendship",
  "dating",
  "random_play",
  "whatever_i_can_get",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const nullableText = (max: number, label: string) =>
  z
    .union([z.string().max(max, `${label} must be ≤${max} chars`), z.null()])
    .transform((v) => {
      if (v === null) return null;
      const t = v.trim();
      return t.length === 0 ? null : t;
    });

const nullableUrl = (label: string) =>
  z
    .union([z.string(), z.null()])
    .transform((v) => (v === null ? null : v.trim()))
    .refine(
      (v) => v === null || v.length === 0 || /^https?:\/\//.test(v),
      `${label} must start with http:// or https://`,
    )
    .transform((v) => (v && v.length > 0 ? v : null));

export const registerUserSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "displayName must be 1–80 chars")
    .max(80, "displayName must be 1–80 chars"),
  status: nullableText(280, "status").nullish().default(null),
  network: nullableText(80, "network").nullish().default(null),
  aboutMe: nullableText(2000, "aboutMe").nullish().default(null),
  basic: z
    .object({
      sex: z.enum(SEX_VALUES).nullish().default(null),
      birthday: z
        .union([
          z.string().regex(ISO_DATE, "basic.birthday must be ISO yyyy-mm-dd"),
          z.null(),
        ])
        .nullish()
        .default(null),
      hometown: nullableText(120, "basic.hometown").nullish().default(null),
      currentResidence: nullableText(120, "basic.currentResidence")
        .nullish()
        .default(null),
      phone: nullableText(40, "basic.phone").nullish().default(null),
      aim: nullableText(40, "basic.aim").nullish().default(null),
      website: nullableUrl("basic.website").nullish().default(null),
    })
    .optional(),
  academic: z
    .object({
      classYear: z
        .union([
          z
            .number()
            .int("academic.classYear must be an integer")
            .min(1900, "academic.classYear must be ≥ 1900")
            .max(2100, "academic.classYear must be ≤ 2100"),
          z.null(),
        ])
        .nullish()
        .default(null),
      concentration: nullableText(120, "academic.concentration")
        .nullish()
        .default(null),
      highSchool: nullableText(160, "academic.highSchool")
        .nullish()
        .default(null),
      courses: z
        .array(z.string().trim().min(1).max(80))
        .max(20, "academic.courses cannot exceed 20 entries")
        .default([]),
    })
    .optional(),
  social: z
    .object({
      relationshipStatus: z.enum(RELATIONSHIP_VALUES).nullish().default(null),
      interestedIn: z.enum(INTERESTED_IN_VALUES).nullish().default(null),
      lookingFor: z.array(z.enum(LOOKING_FOR_VALUES)).default([]),
      politicalViews: nullableText(120, "social.politicalViews")
        .nullish()
        .default(null),
      religiousViews: nullableText(120, "social.religiousViews")
        .nullish()
        .default(null),
    })
    .optional(),
  favorites: z
    .object({
      books: nullableText(500, "favorites.books").nullish().default(null),
      movies: nullableText(500, "favorites.movies").nullish().default(null),
      music: nullableText(500, "favorites.music").nullish().default(null),
      tv: nullableText(500, "favorites.tv").nullish().default(null),
      quotes: nullableText(500, "favorites.quotes").nullish().default(null),
    })
    .optional(),
});

export type RegisterUserInput = z.input<typeof registerUserSchema>;
export type RegisterUserPayload = z.output<typeof registerUserSchema>;

/**
 * Create the `users/{uid}` document from the signup form. Identity
 * (sub/email/picture) is supplied separately — the API reads it from the
 * Auth0 session so the client can't forge another user's identity.
 */
export async function registerUser(
  identity: { sub: string; email: string; picture: string | null },
  rawForm: unknown,
): Promise<User> {
  if (!identity?.sub) {
    throw new ValidationError(`registerUser: identity.sub is required`);
  }
  if (!identity.email) {
    throw new ValidationError(
      `registerUser: identity.email is required for sub ${identity.sub}`,
    );
  }
  const parsed = registerUserSchema.safeParse(rawForm);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "<root>";
    throw new ValidationError(
      `registerUser: invalid field '${path}': ${issue?.message ?? "validation failed"}`,
    );
  }
  const form = parsed.data;

  const uid = sanitizeAuthSub(identity.sub);
  const ref = usersCol().doc(uid);

  const existing = await tryGetUser(uid);
  if (existing) {
    throw new Error(
      `registerUser: user ${uid} is already registered; use PUT /api/users/me to update profile fields`,
    );
  }

  const displayName = form.displayName;
  const displayNameLower = displayName.toLowerCase();
  const nameTokens = nameTokensFor(displayName);
  const now = FieldValue.serverTimestamp();

  await ref.set({
    email: identity.email,
    displayName,
    photoURL: identity.picture,
    createdAt: now,
    updatedAt: now,
    status: form.status,
    network: form.network,
    basic: { ...EMPTY_BASIC, ...form.basic },
    academic: { ...EMPTY_ACADEMIC, ...form.academic },
    social: { ...EMPTY_SOCIAL, ...form.social },
    favorites: { ...EMPTY_FAVORITES, ...form.favorites },
    aboutMe: form.aboutMe,
    displayNameLower,
    nameTokens,
    counts: { friends: 0, wallPosts: 0, pokesReceived: 0 },
  } as unknown as User);

  const written = await tryGetUser(uid);
  if (!written) {
    throw new Error(
      `registerUser: wrote user ${uid} but read-back returned null`,
    );
  }
  return written;
}

// ── update ─────────────────────────────────────────────────────────────────

export type UpdateUserPatch = Partial<
  Pick<
    User,
    | "displayName"
    | "photoURL"
    | "status"
    | "network"
    | "basic"
    | "academic"
    | "social"
    | "favorites"
    | "aboutMe"
  >
>;

/**
 * Patch a user doc. Only the fields present in `patch` are written. If
 * `displayName` is in the patch we re-derive `displayNameLower` and
 * `nameTokens` so the search index stays consistent. Always sets `updatedAt`.
 */
export async function updateUser(
  uid: string,
  patch: UpdateUserPatch,
): Promise<User> {
  if (!uid) {
    throw new ValidationError("updateUser: 'uid' is required");
  }
  const ref = usersCol().doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new UserNotFoundError(`User ${uid} not found`);
  }

  const write: Record<string, unknown> = { ...patch };

  if (typeof patch.displayName === "string" && patch.displayName.length > 0) {
    write.displayNameLower = patch.displayName.toLowerCase();
    write.nameTokens = nameTokensFor(patch.displayName);
  }

  write.updatedAt = FieldValue.serverTimestamp();

  await ref.update(write);

  const after = await tryGetUser(uid);
  if (!after) {
    throw new Error(
      `updateUser: updated user ${uid} but read-back returned null`,
    );
  }
  return after;
}
