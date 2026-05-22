/**
 * Seed gerardo.riano.b@gmail.com's social network with realistic 2004-era
 * friends, wall posts, pokes, and a pending friend request.
 *
 * Runs against the REAL Firestore project named by FIRESTORE_PROJECT_ID. If
 * FIRESTORE_EMULATOR_HOST is set, the Admin SDK will auto-route to the
 * emulator instead — convenient for local dev.
 *
 *   npm run seed
 *
 * Idempotent: re-running with the same friends won't duplicate users/posts
 * (uids are deterministic, posts are skipped when a matching marker exists).
 *
 * Special handling for "gerardo": we never know his real Auth0 sub until he
 * actually logs in, so:
 *   1. If a user with email `gerardo.riano.b@gmail.com` already exists in
 *      Firestore (he has signed in at least once), we re-use that uid.
 *   2. Otherwise we provision a placeholder under `seed_gerardo`. On his
 *      first real login the layout will provision his real uid; you'll then
 *      see two gerardos in /search until you manually merge or delete the
 *      placeholder. (Run this script again *after* his first login to get a
 *      single canonical row.)
 */

export {};

// .env.local is loaded by Node via the `--env-file=.env.local` flag in the
// npm script ("npm run seed"). If you invoke this file directly via `tsx
// scripts/seed.ts`, set FIRESTORE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS
// in your shell first.

import { FieldValue } from "firebase-admin/firestore";

import { db } from "@/src/lib/firestore/admin";
import {
  friendshipConverter,
  userConverter,
  wallPostConverter,
} from "@/src/lib/firestore/converters";
import { sendFriendRequest } from "@/src/lib/friend-requests/repository";
import { pokeUser } from "@/src/lib/pokes/repository";
import { tokenizeDisplayName } from "@/src/lib/users/repository";
import { createWallPost } from "@/src/lib/wall-posts/repository";

// ── config ──────────────────────────────────────────────────────────────────

const GERARDO_EMAIL = "gerardo.riano.b@gmail.com";
const GERARDO_PLACEHOLDER_UID = "seed_gerardo";

interface SeedPerson {
  uid: string;
  displayName: string;
  email: string;
  network: string;
  status: string;
  photoURL: string | null;
  aboutMe: string;
  sex: "male" | "female";
  classYear: number;
  concentration: string;
}

/** Friends to wire up around gerardo. Realistic period names. */
const FRIENDS: SeedPerson[] = [
  {
    uid: "seed_alice",
    displayName: "Alice Anderson",
    email: "alice@example.com",
    network: "harvard",
    status: "Alice is studying for midterms.",
    photoURL: "https://i.pravatar.cc/150?u=seed_alice",
    aboutMe: "Sophomore, pre-med, lifeguard at the MAC.",
    sex: "female",
    classYear: 2007,
    concentration: "Biology",
  },
  {
    uid: "seed_bob",
    displayName: "Bob Burton",
    email: "bob@example.com",
    network: "stanford",
    status: "Bob is procrastinating on his pset.",
    photoURL: "https://i.pravatar.cc/150?u=seed_bob",
    aboutMe: "CS major, dorm hockey enthusiast, perpetually late.",
    sex: "male",
    classYear: 2006,
    concentration: "Computer Science",
  },
  {
    uid: "seed_chris",
    displayName: "Chris Rivers",
    email: "chris@example.com",
    network: "harvard",
    status: "Chris is at the dining hall again.",
    photoURL: "https://i.pravatar.cc/150?u=seed_chris",
    aboutMe: "Government concentrator. Co-founder of an absurd group.",
    sex: "male",
    classYear: 2006,
    concentration: "Government",
  },
  {
    uid: "seed_erin",
    displayName: "Erin Cohlan",
    email: "erin@example.com",
    network: "harvard",
    status: "Erin is at LOCKDOWN.",
    photoURL: "https://i.pravatar.cc/150?u=seed_erin",
    aboutMe: "VES & psychology. Photo album curator extraordinaire.",
    sex: "female",
    classYear: 2005,
    concentration: "VES",
  },
  {
    uid: "seed_jessica",
    displayName: "Jessica Terry",
    email: "jessica@example.com",
    network: "columbia",
    status: "Jessica is rewatching The OC.",
    photoURL: "https://i.pravatar.cc/150?u=seed_jessica",
    aboutMe: "English major, occasional folksinger.",
    sex: "female",
    classYear: 2007,
    concentration: "English",
  },
  {
    uid: "seed_kevin",
    displayName: "Kevin Kozlowski",
    email: "kevin@example.com",
    network: "yale",
    status: "Kevin is fielding offers from i-banks.",
    photoURL: "https://i.pravatar.cc/150?u=seed_kevin",
    aboutMe: "Econ, club soccer, debate team.",
    sex: "male",
    classYear: 2005,
    concentration: "Economics",
  },
];

/** Two more users who AREN'T friends — used for the pending friend request + a stranger. */
const STRANGERS: SeedPerson[] = [
  {
    uid: "seed_priya",
    displayName: "Priya Sharma",
    email: "priya@example.com",
    network: "mit",
    status: "Priya is hunting for a summer internship.",
    photoURL: "https://i.pravatar.cc/150?u=seed_priya",
    aboutMe: "Course 6, robotics team, swing-dance club.",
    sex: "female",
    classYear: 2006,
    concentration: "Computer Science",
  },
  {
    uid: "seed_marcus",
    displayName: "Marcus Bell",
    email: "marcus@example.com",
    network: "princeton",
    status: "Marcus is looking for a thesis advisor.",
    photoURL: "https://i.pravatar.cc/150?u=seed_marcus",
    aboutMe: "Politics + history. Editor at the campus paper.",
    sex: "male",
    classYear: 2005,
    concentration: "Politics",
  },
];

// ── helpers ─────────────────────────────────────────────────────────────────

function usersCol() {
  return db.collection("users").withConverter(userConverter);
}
function friendshipsCol() {
  return db.collection("friendships").withConverter(friendshipConverter);
}
function wallPostsCol() {
  return db.collection("wallPosts").withConverter(wallPostConverter);
}

function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

async function findUidByEmail(email: string): Promise<string | null> {
  const snap = await usersCol().where("email", "==", email).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return doc.id;
}

/**
 * Idempotent upsert. If the doc exists we leave it alone (don't clobber
 * counters or profile content the user has typed). If missing we write the
 * skeleton with the provided fields filled in.
 */
async function upsertSeedUser(person: SeedPerson): Promise<void> {
  const ref = usersCol().doc(person.uid);
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`  · ${person.uid}  (exists, skipped)`);
    return;
  }

  const now = FieldValue.serverTimestamp();
  await db
    .collection("users")
    .doc(person.uid)
    .set({
      email: person.email,
      displayName: person.displayName,
      photoURL: person.photoURL,
      createdAt: now,
      updatedAt: now,
      status: person.status,
      network: person.network,
      basic: {
        sex: person.sex,
        birthday: null,
        hometown: null,
        currentResidence: null,
        phone: null,
        aim: null,
        website: null,
      },
      academic: {
        classYear: person.classYear,
        concentration: person.concentration,
        highSchool: null,
        courses: [],
      },
      social: {
        relationshipStatus: null,
        interestedIn: null,
        lookingFor: [],
        politicalViews: null,
        religiousViews: null,
      },
      favorites: {
        books: null,
        movies: null,
        music: null,
        tv: null,
        quotes: null,
      },
      aboutMe: person.aboutMe,
      displayNameLower: person.displayName.toLowerCase(),
      nameTokens: tokenizeDisplayName(person.displayName),
      counts: { friends: 0, wallPosts: 0, pokesReceived: 0 },
    });
  console.log(`  + ${person.uid}  (${person.displayName})`);
}

/**
 * Establish a friendship without going through the request/accept flow.
 * Idempotent: skips if the friendship doc already exists; otherwise creates
 * it and bumps both users' `counts.friends`.
 */
async function ensureFriendship(a: string, b: string): Promise<void> {
  if (a === b) throw new Error(`[seed] cannot friend yourself: ${a}`);
  const id = pairId(a, b);
  const ref = friendshipsCol().doc(id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return; // idempotent
    const [aSorted, bSorted] = a < b ? [a, b] : [b, a];
    tx.set(db.collection("friendships").doc(id), {
      userA: aSorted,
      userB: bSorted,
      since: FieldValue.serverTimestamp(),
    });
    tx.update(db.collection("users").doc(a), {
      "counts.friends": FieldValue.increment(1),
    });
    tx.update(db.collection("users").doc(b), {
      "counts.friends": FieldValue.increment(1),
    });
  });
}

/**
 * Wall-post seeding is keyed by a deterministic id so reruns don't pile up
 * duplicates. We write the doc directly (bypassing the friendship gate in
 * `createWallPost`) when a key is supplied, OR call `createWallPost` if not.
 * For seeding we always use the keyed path.
 */
async function seedWallPost(opts: {
  key: string;
  authorUid: string;
  wallOwnerUid: string;
  text: string;
}): Promise<void> {
  const ref = wallPostsCol().doc(`seed_${opts.key}`);
  const existing = await ref.get();
  if (existing.exists) return; // idempotent

  // Need the author's denormalized display fields.
  const authorSnap = await usersCol().doc(opts.authorUid).get();
  if (!authorSnap.exists) {
    throw new Error(
      `[seed] author ${opts.authorUid} not found for post ${opts.key}`,
    );
  }
  const author = authorSnap.data();
  if (!author) {
    throw new Error(`[seed] author ${opts.authorUid} has no data`);
  }

  await db.runTransaction(async (tx) => {
    tx.set(db.collection("wallPosts").doc(`seed_${opts.key}`), {
      wallOwnerUid: opts.wallOwnerUid,
      authorUid: opts.authorUid,
      authorDisplayName: author.displayName,
      authorPhotoURL: author.photoURL,
      text: opts.text,
      createdAt: FieldValue.serverTimestamp(),
      deletedAt: null,
    });
    tx.update(db.collection("users").doc(opts.wallOwnerUid), {
      "counts.wallPosts": FieldValue.increment(1),
    });
  });
}

// Silence the "imported but unused" warning — `createWallPost` is the route
// path; `seedWallPost` is intentionally simpler (no friendship gate).
void createWallPost;
void sendFriendRequest;
void pokeUser;

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  // Guard rails.
  if (!process.env.FIRESTORE_PROJECT_ID) {
    throw new Error(
      "Missing FIRESTORE_PROJECT_ID. Set it in .env.local or your shell.",
    );
  }
  const target = process.env.FIRESTORE_EMULATOR_HOST
    ? `EMULATOR @ ${process.env.FIRESTORE_EMULATOR_HOST}`
    : `REAL Firestore project '${process.env.FIRESTORE_PROJECT_ID}'`;
  console.log(`[seed] target: ${target}`);

  // 1. Resolve gerardo's uid.
  console.log(`[seed] resolving gerardo (${GERARDO_EMAIL}) …`);
  let gerardoUid = await findUidByEmail(GERARDO_EMAIL);
  if (gerardoUid) {
    console.log(`[seed]   found existing uid=${gerardoUid}`);
  } else {
    gerardoUid = GERARDO_PLACEHOLDER_UID;
    console.log(
      `[seed]   no existing row; creating placeholder uid=${gerardoUid}`,
    );
    await upsertSeedUser({
      uid: gerardoUid,
      displayName: "Gerardo Riaño",
      email: GERARDO_EMAIL,
      network: "self-declared",
      status: "Gerardo is shipping a 2004-style social network.",
      photoURL: `https://i.pravatar.cc/150?u=${encodeURIComponent(GERARDO_EMAIL)}`,
      aboutMe: "Building the cadre-test MVP. Likes Firestore, hates fallbacks.",
      sex: "male",
      classYear: 2006,
      concentration: "Computer Science",
    });
  }

  // 2. Friends.
  console.log("[seed] upserting friends …");
  for (const f of FRIENDS) await upsertSeedUser(f);

  // 3. Strangers (no friendship — used for incoming request + poke from non-friend).
  console.log("[seed] upserting strangers …");
  for (const s of STRANGERS) await upsertSeedUser(s);

  // 4. Friendships: gerardo ↔ each friend.
  console.log("[seed] wiring friendships …");
  for (const f of FRIENDS) {
    await ensureFriendship(gerardoUid, f.uid);
    console.log(`  · gerardo ↔ ${f.uid}`);
  }
  // A couple of friend-friend edges so the network feels real.
  await ensureFriendship("seed_alice", "seed_bob");
  await ensureFriendship("seed_chris", "seed_erin");
  await ensureFriendship("seed_bob", "seed_kevin");
  console.log("  · cross-friend edges seeded");

  // 5. Wall posts — friends posting on gerardo's wall, gerardo posting on theirs,
  //    a couple of friend-on-friend posts. Mix of who-posts-where so the activity
  //    feed has variety.
  console.log("[seed] seeding wall posts …");
  await seedWallPost({
    key: "alice-on-gerardo",
    authorUid: "seed_alice",
    wallOwnerUid: gerardoUid,
    text: "Welcome to thefacebook, Gerardo! Glad you finally signed up.",
  });
  await seedWallPost({
    key: "bob-on-gerardo",
    authorUid: "seed_bob",
    wallOwnerUid: gerardoUid,
    text: "are you still up for the pset tomorrow?",
  });
  await seedWallPost({
    key: "chris-on-gerardo",
    authorUid: "seed_chris",
    wallOwnerUid: gerardoUid,
    text: "join the group, you cowards",
  });
  await seedWallPost({
    key: "erin-on-gerardo",
    authorUid: "seed_erin",
    wallOwnerUid: gerardoUid,
    text: "i got the LOCKDOWN photos uploaded.",
  });

  await seedWallPost({
    key: "gerardo-on-alice",
    authorUid: gerardoUid,
    wallOwnerUid: "seed_alice",
    text: "good luck on the bio midterm tomorrow!!",
  });
  await seedWallPost({
    key: "gerardo-on-bob",
    authorUid: gerardoUid,
    wallOwnerUid: "seed_bob",
    text: "pset partner? meet at the lamont café at 9",
  });
  await seedWallPost({
    key: "gerardo-on-chris",
    authorUid: gerardoUid,
    wallOwnerUid: "seed_chris",
    text: "what was the group name again",
  });

  await seedWallPost({
    key: "alice-on-bob",
    authorUid: "seed_alice",
    wallOwnerUid: "seed_bob",
    text: "happy birthday bob!!! 🎂",
  });
  await seedWallPost({
    key: "chris-on-erin",
    authorUid: "seed_chris",
    wallOwnerUid: "seed_erin",
    text: "the photo album is amazing",
  });
  await seedWallPost({
    key: "kevin-on-bob",
    authorUid: "seed_kevin",
    wallOwnerUid: "seed_bob",
    text: "you on for soccer this weekend?",
  });
  console.log("  · 10 wall posts seeded");

  // 6. Pokes — 3 unacknowledged, addressed to gerardo. Skip pokeUser for
  //    deterministic ids and idempotency; write directly.
  console.log("[seed] seeding pokes …");
  const pokeMarkers = [
    { from: "seed_alice", key: "alice-poke-gerardo" },
    { from: "seed_chris", key: "chris-poke-gerardo" },
    { from: "seed_priya", key: "priya-poke-gerardo" }, // poke from a non-friend
  ];
  for (const m of pokeMarkers) {
    const pokeRef = db.collection("pokes").doc(`seed_${m.key}`);
    const existing = await pokeRef.get();
    if (existing.exists) {
      console.log(`  · ${m.key} (exists, skipped)`);
      continue;
    }
    const fromSnap = await usersCol().doc(m.from).get();
    if (!fromSnap.exists) {
      throw new Error(`[seed] poker ${m.from} not found`);
    }
    const from = fromSnap.data();
    if (!from) throw new Error(`[seed] poker ${m.from} has no data`);

    await db.runTransaction(async (tx) => {
      tx.set(pokeRef, {
        fromUid: m.from,
        fromDisplayName: from.displayName,
        fromPhotoURL: from.photoURL,
        toUid: gerardoUid!,
        createdAt: FieldValue.serverTimestamp(),
        acknowledged: false,
      });
      tx.update(db.collection("users").doc(gerardoUid!), {
        "counts.pokesReceived": FieldValue.increment(1),
      });
    });
    console.log(`  + ${m.key}`);
  }

  // 7. Friend request — incoming from a stranger (so gerardo's inbox isn't empty).
  console.log("[seed] seeding incoming friend request …");
  const reqRef = db
    .collection("friendRequests")
    .doc(`seed_marcus_${gerardoUid}`);
  const existingReq = await reqRef.get();
  if (existingReq.exists) {
    console.log("  · marcus → gerardo (exists, skipped)");
  } else {
    const marcusSnap = await usersCol().doc("seed_marcus").get();
    const marcus = marcusSnap.data();
    if (!marcus) throw new Error("[seed] seed_marcus missing");
    // Reuse the directed-id convention from the repo.
    await db.collection("friendRequests").doc(`seed_marcus_${gerardoUid}`).set({
      fromUid: "seed_marcus",
      toUid: gerardoUid,
      fromDisplayName: marcus.displayName,
      fromPhotoURL: marcus.photoURL,
      createdAt: FieldValue.serverTimestamp(),
      message: "We met at the Princeton-Harvard mixer — add me?",
    });
    console.log("  + marcus → gerardo");
  }

  console.log("[seed] DONE.");
  console.log("");
  console.log(`gerardo uid: ${gerardoUid}`);
  console.log("friends: 6, wall posts: 10, pokes: 3, requests: 1");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] FAILED:", err);
    process.exit(1);
  });
