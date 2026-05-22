import { NextResponse } from "next/server";
import { z } from "zod";

import { mapRepoError, requireSession } from "@/src/lib/api/handle-route";
import { listPokesFor, pokeUser } from "@/src/lib/pokes/repository";

const PokeSchema = z
  .object({
    toUid: z.string().min(1, "toUid must be a non-empty string"),
  })
  .strict();

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const pokes = await listPokesFor(auth.uid);
    return NextResponse.json({ pokes }, { status: 200 });
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
      { error: "POST /api/pokes: request body is not valid JSON" },
      { status: 400 },
    );
  }

  const parsed = PokeSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "<root>";
    return NextResponse.json(
      {
        error: `POST /api/pokes: invalid field '${path}': ${issue?.message ?? "validation failed"}`,
      },
      { status: 400 },
    );
  }

  try {
    const poke = await pokeUser({
      fromUid: auth.uid,
      toUid: parsed.data.toUid,
    });
    return NextResponse.json({ poke }, { status: 201 });
  } catch (e) {
    return mapRepoError(e);
  }
}
