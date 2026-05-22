import { NextResponse } from "next/server";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { sanitizeAuthReturnTo } from "@/src/lib/auth/auth0-login";
import { getUser, registerUser } from "@/src/lib/users/repository";

/**
 * POST /api/users/register — create a `users/{uid}` document for the
 * currently-authenticated Auth0 user from the signup form.
 *
 * Request body:
 *   { form: <RegisterUserInput>, returnTo?: string }
 *
 * Behavior:
 *  - 401 if no Auth0 session.
 *  - 409 if the user is already registered (Firestore doc exists).
 *  - 400 if the form payload fails schema validation; the message names the
 *    offending field (e.g. `invalid field 'basic.birthday': must be ISO …`).
 *  - 201 { uid, redirectTo } on success.
 *
 * Identity (sub/email/picture) is read from the server-side session — the
 * client cannot impersonate another user by tampering with the request body.
 */
export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const sessionUser = auth.session.user as {
    sub?: string;
    email?: string;
    picture?: string | null;
  };
  if (!sessionUser.sub || !sessionUser.email) {
    return NextResponse.json(
      {
        error:
          "POST /api/users/register: Auth0 session is missing required claims (sub/email); re-authenticate",
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "POST /api/users/register: request body is not valid JSON" },
      { status: 400 },
    );
  }
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "POST /api/users/register: request body must be a JSON object" },
      { status: 400 },
    );
  }

  const { form, returnTo } = body as { form?: unknown; returnTo?: unknown };
  const safeReturnTo = sanitizeAuthReturnTo(
    typeof returnTo === "string" ? returnTo : null,
    "/feed",
  );

  // Idempotency: if a row already exists, treat it as a conflict so the
  // caller can fall through to sign-in rather than overwriting profile data.
  const existing = await getUser(auth.uid);
  if (existing) {
    return NextResponse.json(
      {
        error: `POST /api/users/register: user ${auth.uid} is already registered; use PUT /api/users/me to update profile fields`,
      },
      { status: 409 },
    );
  }

  try {
    const user = await registerUser(
      {
        sub: sessionUser.sub,
        email: sessionUser.email,
        picture: sessionUser.picture ?? null,
      },
      form,
    );
    return NextResponse.json(
      { uid: user.uid, redirectTo: safeReturnTo },
      { status: 201 },
    );
  } catch (e) {
    return mapRepoError(e);
  }
}
