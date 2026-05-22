import { NextResponse } from "next/server";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { searchUsersByName } from "@/src/lib/users/repository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      {
        error:
          "GET /api/users/search: query parameter 'q' is required and must be non-empty",
      },
      { status: 400 },
    );
  }

  const limitRaw = url.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitRaw !== null) {
    const parsed = Number(limitRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return NextResponse.json(
        {
          error: `GET /api/users/search: query parameter 'limit' must be an integer in [1, ${MAX_LIMIT}]; got ${limitRaw}`,
        },
        { status: 400 },
      );
    }
    limit = parsed;
  }

  try {
    const users = await searchUsersByName(q.trim(), limit);
    return NextResponse.json({ users }, { status: 200 });
  } catch (e) {
    return mapRepoError(e);
  }
}
