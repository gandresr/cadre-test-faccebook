import { NextResponse } from "next/server";

import { auth0 } from "@/src/lib/auth/auth0";
import { sanitizeUid } from "@/src/lib/uid";

type ErrShape = { error: string };

type Auth0SessionShape = NonNullable<
  Awaited<ReturnType<typeof auth0.getSession>>
>;

export type RequireSessionOk = {
  ok: true;
  uid: string;
  session: Auth0SessionShape;
};

export type RequireSessionErr = {
  ok: false;
  response: NextResponse<ErrShape>;
};

const UNAUTHORIZED_MESSAGE = "Unauthorized: sign in at /auth/sign-in";

/**
 * Maps a thrown error from `src/lib/**\/repository.ts` to a JSON HTTP response.
 * Repos throw with a message prefix like `[domain.fn] specific reason` — we
 * inspect the (case-insensitive) message body to pick the right status code.
 *
 * Order matters: more specific matches first.
 */
export function mapRepoError(e: unknown): NextResponse<ErrShape> {
  const msg = e instanceof Error ? e.message : String(e);

  // 409 Conflict — duplicate / already-in-target-state
  if (/already (friends|have a pending)/i.test(msg)) {
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // 422 Unprocessable Entity — business-rule violation on otherwise valid input
  if (
    /cannot (poke yourself|send a request to yourself|open a conversation with yourself|DM yourself)|must be \d+.{1,5}\d+ chars|banned word/i.test(
      msg,
    )
  ) {
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // 403 Forbidden — session present but not authorized for THIS resource
  if (
    /not the (recipient|author|wall owner|sender)|is not a friend of|is not a participant of|forbidden|cannot (delete|send|mark read|read)/i.test(
      msg,
    )
  ) {
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  // 404 Not Found
  if (/not found/i.test(msg)) {
    return NextResponse.json({ error: msg }, { status: 404 });
  }

  // 500 Internal — log with context so the underlying cause is greppable

  console.error("[api] unhandled repo error:", e);
  return NextResponse.json(
    { error: `Internal error: ${msg}` },
    { status: 500 },
  );
}

/**
 * Pulls and verifies the Auth0 session for the current request, returning the
 * sanitized uid alongside the session. Use this at the top of every protected
 * route handler — `proxy.ts` gates `/api/*` but the DAL is authoritative.
 */
export async function requireSession(): Promise<
  RequireSessionOk | RequireSessionErr
> {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: UNAUTHORIZED_MESSAGE },
        { status: 401 },
      ),
    };
  }
  const uid = sanitizeUid(session.user.sub);
  return { ok: true, uid, session };
}
