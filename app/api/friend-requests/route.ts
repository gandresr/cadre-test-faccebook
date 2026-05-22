import { NextResponse } from "next/server";
import { z } from "zod";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import {
  listIncomingRequests,
  listOutgoingRequests,
  sendFriendRequest,
} from "@/src/lib/friend-requests/repository";

const SendSchema = z
  .object({
    toUid: z.string().min(1, "toUid must be a non-empty string"),
    message: z
      .string()
      .max(500, "message must be at most 500 characters")
      .optional(),
  })
  .strict();

export async function GET(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const direction = new URL(request.url).searchParams.get("direction");
  if (direction !== "incoming" && direction !== "sent") {
    return NextResponse.json(
      {
        error:
          "GET /api/friend-requests: query parameter 'direction' is required and must be 'incoming' or 'sent'",
      },
      { status: 400 },
    );
  }

  try {
    const requests =
      direction === "incoming"
        ? await listIncomingRequests(auth.uid)
        : await listOutgoingRequests(auth.uid);
    return NextResponse.json({ requests }, { status: 200 });
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
      { error: "POST /api/friend-requests: request body is not valid JSON" },
      { status: 400 },
    );
  }

  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "<root>";
    return NextResponse.json(
      {
        error: `POST /api/friend-requests: invalid field '${path}': ${issue?.message ?? "validation failed"}`,
      },
      { status: 400 },
    );
  }

  try {
    const created = await sendFriendRequest({
      fromUid: auth.uid,
      toUid: parsed.data.toUid,
      message: parsed.data.message ?? undefined,
    });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (e) {
    return mapRepoError(e);
  }
}
