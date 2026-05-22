import { NextResponse } from "next/server";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { UserNotFoundError } from "@/src/lib/errors";
import { getUser } from "@/src/lib/users/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { uid } = await params;
  if (!uid) {
    return NextResponse.json(
      { error: "GET /api/users/[uid]: path parameter 'uid' is required" },
      { status: 400 },
    );
  }

  try {
    const user = await getUser(uid);
    return NextResponse.json({ user }, { status: 200 });
  } catch (e) {
    if (e instanceof UserNotFoundError) {
      return NextResponse.json(
        { error: `GET /api/users/${uid}: ${e.message}` },
        { status: 404 },
      );
    }
    return mapRepoError(e);
  }
}
