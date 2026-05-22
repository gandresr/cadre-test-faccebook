import { NextResponse } from "next/server";
import { z } from "zod";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { acknowledgePokes } from "@/src/lib/pokes/repository";

const AckSchema = z
  .object({
    ids: z.array(z.string().min(1)).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  // Allow an empty body (ack all). Don't fail on empty/no-JSON; only fail on
  // syntactically-broken JSON when a body is present.
  let body: unknown = {};
  const text = await request.text();
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "POST /api/pokes/acknowledge: request body is not valid JSON",
        },
        { status: 400 },
      );
    }
  }

  const parsed = AckSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "<root>";
    return NextResponse.json(
      {
        error: `POST /api/pokes/acknowledge: invalid field '${path}': ${issue?.message ?? "validation failed"}`,
      },
      { status: 400 },
    );
  }

  const ids =
    parsed.data.ids && parsed.data.ids.length > 0 ? parsed.data.ids : undefined;

  try {
    const count = await acknowledgePokes(auth.uid, ids);
    return NextResponse.json({ count }, { status: 200 });
  } catch (e) {
    return mapRepoError(e);
  }
}
