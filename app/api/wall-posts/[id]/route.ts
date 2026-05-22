import { NextResponse } from "next/server";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { deleteWallPost } from "@/src/lib/wall-posts/repository";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "DELETE /api/wall-posts/[id]: path parameter 'id' is required" },
      { status: 400 },
    );
  }

  try {
    await deleteWallPost(id, auth.uid);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return mapRepoError(e);
  }
}
