import { NextResponse } from "next/server";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { acceptFriendRequest } from "@/src/lib/friend-requests/repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      {
        error:
          "POST /api/friend-requests/[id]/accept: path parameter 'id' is required",
      },
      { status: 400 },
    );
  }

  try {
    await acceptFriendRequest(id, auth.uid);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return mapRepoError(e);
  }
}
