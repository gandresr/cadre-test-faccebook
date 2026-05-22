import { NextResponse } from "next/server";
import { z } from "zod";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import {
  ensureConversation,
  listConversationsFor,
} from "@/src/lib/conversations/repository";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const CreateSchema = z
  .object({
    otherUid: z.string().min(1, "otherUid must be a non-empty string"),
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

export async function GET(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limitResult = parseLimit(url.searchParams.get("limit"));
  if (typeof limitResult !== "number") {
    return NextResponse.json(
      { error: `GET /api/conversations: ${limitResult.error}` },
      { status: 400 },
    );
  }

  try {
    const conversations = await listConversationsFor(auth.uid, limitResult);
    return NextResponse.json({ conversations }, { status: 200 });
  } catch (e) {
    return mapRepoError(e);
  }
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "POST /api/conversations: request body is not valid JSON" },
      { status: 400 },
    );
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "<root>";
    return NextResponse.json(
      {
        error: `POST /api/conversations: invalid field '${path}': ${issue?.message ?? "validation failed"}`,
      },
      { status: 400 },
    );
  }

  try {
    const convId = await ensureConversation(auth.uid, parsed.data.otherUid);
    return NextResponse.json({ convId }, { status: 200 });
  } catch (e) {
    return mapRepoError(e);
  }
}
