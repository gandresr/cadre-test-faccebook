import { NextResponse } from "next/server";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { unfriend } from "@/src/lib/friendships/repository";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ otherUid: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { otherUid } = await params;
  if (!otherUid) {
    return NextResponse.json(
      {
        error:
          "DELETE /api/friendships/[otherUid]: path parameter 'otherUid' is required",
      },
      { status: 400 },
    );
  }

  try {
    await unfriend(auth.uid, otherUid);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return mapRepoError(e);
  }
}
