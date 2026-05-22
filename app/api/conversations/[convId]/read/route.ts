import { NextResponse } from "next/server";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { markRead } from "@/src/lib/conversations/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ convId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { convId } = await context.params;

  try {
    await markRead({ convId, requesterUid: auth.uid });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapRepoError(e);
  }
}
