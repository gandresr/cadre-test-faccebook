import { NextResponse } from "next/server";
import { z } from "zod";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { listMessages, sendMessage } from "@/src/lib/conversations/repository";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

const SendSchema = z
  .object({
    text: z
      .string()
      .min(1, "text must be 1–2000 characters; got 0")
      .max(2000, "text must be 1–2000 characters; got >2000"),
  })
  .strict();

function parseLimit(raw: string | null): number | { error: string } {
  if (raw === null) return DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    return {
      error: `query parameter 'limit' must be an integer in [1, ${MAX_LIMIT}]; got ${raw}`,
    };
  }
  return parsed;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ convId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { convId } = await context.params;
  const url = new URL(request.url);
  const limitResult = parseLimit(url.searchParams.get("limit"));
  if (typeof limitResult !== "number") {
    return NextResponse.json(
      {
        error: `GET /api/conversations/${convId}/messages: ${limitResult.error}`,
      },
      { status: 400 },
    );
  }

  try {
    const messages = await listMessages({
      convId,
      requesterUid: auth.uid,
      limit: limitResult,
    });
    return NextResponse.json({ messages }, { status: 200 });
  } catch (e) {
    return mapRepoError(e);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ convId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { convId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: `POST /api/conversations/${convId}/messages: request body is not valid JSON`,
      },
      { status: 400 },
    );
  }

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "<root>";
    const len =
      path === "text" && typeof (body as { text?: unknown })?.text === "string"
        ? (body as { text: string }).text.length
        : undefined;
    const lengthHint =
      path === "text" && len !== undefined ? `; got ${len}` : "";
    return NextResponse.json(
      {
        error: `POST /api/conversations/${convId}/messages: invalid field '${path}': ${issue?.message ?? "validation failed"}${lengthHint}`,
      },
      { status: 400 },
    );
  }

  try {
    const message = await sendMessage({
      convId,
      fromUid: auth.uid,
      text: parsed.data.text,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    return mapRepoError(e);
  }
}
