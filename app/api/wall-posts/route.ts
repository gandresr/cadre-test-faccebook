import { NextResponse } from "next/server";
import { z } from "zod";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import {
  createWallPost,
  listFriendActivityFeed,
  listWall,
} from "@/src/lib/wall-posts/repository";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const CreateSchema = z
  .object({
    wallOwnerUid: z.string().min(1, "wallOwnerUid must be a non-empty string"),
    text: z
      .string()
      .min(1, "text must be 1–500 characters; got 0")
      .max(500, "text must be 1–500 characters; got >500"),
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
  const wallOwnerUid = url.searchParams.get("wallOwnerUid");
  const feed = url.searchParams.get("feed");

  const limitResult = parseLimit(url.searchParams.get("limit"));
  if (typeof limitResult !== "number") {
    return NextResponse.json(
      { error: `GET /api/wall-posts: ${limitResult.error}` },
      { status: 400 },
    );
  }
  const limit = limitResult;

  if (wallOwnerUid && feed) {
    return NextResponse.json(
      {
        error:
          "GET /api/wall-posts: provide either 'wallOwnerUid' or 'feed=1', not both",
      },
      { status: 400 },
    );
  }

  try {
    if (wallOwnerUid) {
      const posts = await listWall(wallOwnerUid, limit);
      return NextResponse.json({ posts }, { status: 200 });
    }
    if (feed === "1") {
      const posts = await listFriendActivityFeed(auth.uid, limit);
      return NextResponse.json({ posts }, { status: 200 });
    }
    return NextResponse.json(
      {
        error:
          "GET /api/wall-posts: must provide either 'wallOwnerUid=<uid>' or 'feed=1'",
      },
      { status: 400 },
    );
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
      { error: "POST /api/wall-posts: request body is not valid JSON" },
      { status: 400 },
    );
  }

  const parsed = CreateSchema.safeParse(body);
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
        error: `POST /api/wall-posts: invalid field '${path}': ${issue?.message ?? "validation failed"}${lengthHint}`,
      },
      { status: 400 },
    );
  }

  try {
    const post = await createWallPost({
      authorUid: auth.uid,
      wallOwnerUid: parsed.data.wallOwnerUid,
      text: parsed.data.text,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    return mapRepoError(e);
  }
}
