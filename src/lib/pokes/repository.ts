/**
 * Pokes repository — `pokes/{pokeId}` collection (auto-id).
 *
 * Doc-per-poke so "poke back" and "who poked me" work. Denormalizes
 * `fromDisplayName`/`fromPhotoURL` from the sender's user doc at write time
 * so the inbox renders in a single query.
 *
 * Counter maintenance:
 *   - `pokeUser` increments recipient's `counts.pokesReceived`.
 *   - `acknowledgePokes` decrements by the number actually flipped false→true.
 */

import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { Poke, User } from "@/src/types";
import { pokesCol, usersCol } from "@/src/lib/firestore";

// ── writes ─────────────────────────────────────────────────────────────────

export async function pokeUser(opts: {
  fromUid: string;
  toUid: string;
}): Promise<Poke> {
  const { fromUid, toUid } = opts;
  if (!fromUid || !toUid) {
    throw new Error(`[pokes.pokeUser] fromUid and toUid are required`);
  }
  if (fromUid === toUid) {
    throw new Error(`[pokes.pokeUser] cannot poke yourself (${fromUid})`);
  }

  const fromRef = usersCol().doc(fromUid);
  const toRef = usersCol().doc(toUid);
  const fromSnap = await fromRef.get();
  if (!fromSnap.exists) {
    throw new Error(`[pokes.pokeUser] sender ${fromUid} not found`);
  }
  const toSnap = await toRef.get();
  if (!toSnap.exists) {
    throw new Error(`[pokes.pokeUser] target ${toUid} not found`);
  }
  const from = fromSnap.data() as User;

  const docRef = pokesCol().doc();
  const id = docRef.id;
  const payload = {
    id,
    fromUid,
    fromDisplayName: from.displayName,
    fromPhotoURL: from.photoURL,
    toUid,
    createdAt: FieldValue.serverTimestamp(),
    acknowledged: false,
  } as unknown as Poke;

  await docRef.firestore.runTransaction(async (tx) => {
    tx.set(docRef, payload);
    tx.update(toRef, { "counts.pokesReceived": FieldValue.increment(1) });
  });

  // Re-read to materialize the resolved serverTimestamp as an ISO string.
  const written = await docRef.get();
  return written.data() as Poke;
}

// ── reads ──────────────────────────────────────────────────────────────────

/**
 * Pokes where `toUid == uid`, ordered by `createdAt desc`.
 * Returns both acknowledged and unacknowledged.
 */
export async function listPokesFor(uid: string): Promise<Poke[]> {
  if (!uid) throw new Error(`[pokes.listPokesFor] uid is required`);
  // No `orderBy` — would require a composite index. Sort by createdAt
  // (ISO string) in JS after fetch. Per-user poke count is small.
  const snap = await pokesCol().where("toUid", "==", uid).get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}

/**
 * Acknowledge. If `ids` is omitted/empty, ack ALL of `uid`'s unacknowledged
 * pokes (batched). Otherwise ack just the ids that (a) exist and (b) belong
 * to `uid` as the recipient. Decrements recipient's `counts.pokesReceived`
 * by the count actually flipped from false→true. Returns that count.
 */
export async function acknowledgePokes(
  uid: string,
  ids?: string[],
): Promise<number> {
  if (!uid) throw new Error(`[pokes.acknowledgePokes] uid is required`);

  let targets: Array<{ id: string }> = [];
  if (ids && ids.length > 0) {
    const reads = await Promise.all(ids.map((id) => pokesCol().doc(id).get()));
    for (const snap of reads) {
      if (!snap.exists) continue;
      const p = snap.data() as Poke;
      if (p.toUid !== uid) continue;
      if (p.acknowledged) continue;
      targets.push({ id: snap.id });
    }
  } else {
    // Single `where` only — filter `acknowledged` in JS to avoid the composite
    // index requirement.
    const snap = await pokesCol().where("toUid", "==", uid).get();
    targets = snap.docs
      .filter((d) => d.data().acknowledged === false)
      .slice(0, 200)
      .map((d) => ({ id: d.id }));
  }

  if (targets.length === 0) return 0;

  const userRef = usersCol().doc(uid);
  // Chunk writes to stay under Firestore's 500 ops per transaction limit.
  const chunkSize = 200;
  let acked = 0;
  for (let i = 0; i < targets.length; i += chunkSize) {
    const chunk = targets.slice(i, i + chunkSize);
    await userRef.firestore.runTransaction(async (tx) => {
      for (const { id } of chunk) {
        tx.update(pokesCol().doc(id), { acknowledged: true });
      }
      tx.update(userRef, {
        "counts.pokesReceived": FieldValue.increment(-chunk.length),
      });
    });
    acked += chunk.length;
  }
  return acked;
}
