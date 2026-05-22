import { NextResponse } from "next/server";
import { z } from "zod";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { getUser, updateUser } from "@/src/lib/users/repository";

const READ_ONLY_FIELDS = [
  "uid",
  "email",
  "createdAt",
  "updatedAt",
  "displayNameLower",
  "nameTokens",
  "counts",
] as const;

const BasicSchema = z
  .object({
    sex: z.enum(["male", "female", "other"]).nullable(),
    birthday: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "birthday must be ISO yyyy-mm-dd")
      .nullable(),
    hometown: z.string().max(200).nullable(),
    currentResidence: z.string().max(200).nullable(),
    phone: z.string().max(50).nullable(),
    aim: z.string().max(100).nullable(),
    website: z.string().max(500).nullable(),
  })
  .partial();

const AcademicSchema = z
  .object({
    classYear: z.number().int().min(1900).max(2100).nullable(),
    concentration: z.string().max(200).nullable(),
    highSchool: z.string().max(200).nullable(),
    courses: z.array(z.string().max(200)).max(50),
  })
  .partial();

const SocialSchema = z
  .object({
    relationshipStatus: z
      .enum([
        "single",
        "in_relationship",
        "engaged",
        "married",
        "its_complicated",
      ])
      .nullable(),
    interestedIn: z.enum(["men", "women", "both"]).nullable(),
    lookingFor: z.array(
      z.enum(["friendship", "dating", "random_play", "whatever_i_can_get"]),
    ),
    politicalViews: z.string().max(500).nullable(),
    religiousViews: z.string().max(500).nullable(),
  })
  .partial();

const FavoritesSchema = z
  .object({
    books: z.string().max(2000).nullable(),
    movies: z.string().max(2000).nullable(),
    music: z.string().max(2000).nullable(),
    tv: z.string().max(2000).nullable(),
    quotes: z.string().max(2000).nullable(),
  })
  .partial();

const UpdateUserSchema = z
  .object({
    displayName: z.string().min(1).max(100),
    photoURL: z.string().url().max(2000).nullable(),
    status: z.string().max(500).nullable(),
    network: z.string().max(200).nullable(),
    basic: BasicSchema,
    academic: AcademicSchema,
    social: SocialSchema,
    favorites: FavoritesSchema,
    aboutMe: z.string().max(5000).nullable(),
  })
  .partial()
  .strict();

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const user = await getUser(auth.uid);
    if (!user) {
      return NextResponse.json(
        { error: `GET /api/users/me: user ${auth.uid} not found in Firestore` },
        { status: 404 },
      );
    }
    return NextResponse.json({ user }, { status: 200 });
  } catch (e) {
    return mapRepoError(e);
  }
}

export async function PUT(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "PUT /api/users/me: request body is not valid JSON" },
      { status: 400 },
    );
  }

  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "PUT /api/users/me: request body must be a JSON object" },
      { status: 400 },
    );
  }

  for (const field of READ_ONLY_FIELDS) {
    if (field in (body as Record<string, unknown>)) {
      return NextResponse.json(
        { error: `PUT /api/users/me: field '${field}' is read-only` },
        { status: 400 },
      );
    }
  }

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "<root>";
    return NextResponse.json(
      {
        error: `PUT /api/users/me: invalid field '${path}': ${issue?.message ?? "validation failed"}`,
      },
      { status: 400 },
    );
  }

  try {
    // Zod's `.nullish()` produces `T | null | undefined`; `Partial<User>` only
    // allows `T | null` on nested fields. Cast at the boundary — the schema has
    // already validated the field shapes; the repo treats `undefined` and
    // missing-key identically.
    const user = await updateUser(
      auth.uid,
      parsed.data as Parameters<typeof updateUser>[1],
    );
    return NextResponse.json({ user }, { status: 200 });
  } catch (e) {
    return mapRepoError(e);
  }
}
