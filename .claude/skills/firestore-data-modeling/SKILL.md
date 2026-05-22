---
name: firestore-data-modeling
description: Use when designing Firestore collections, writing queries, designing indexes, configuring converters, or writing security rules. Triggers on mentions of Firestore, Firebase Admin SDK, FirestoreDataConverter, composite indexes, security rules, subcollections, denormalization.
---

# Firestore data modeling — Admin SDK first

## Step 1 — Fetch the canonical docs before writing schema-touching code

```
WebFetch url=https://firebase.google.com/docs/firestore/manage-data/structure-data
WebFetch url=https://firebase.google.com/docs/firestore/query-data/queries
WebFetch url=https://firebase.google.com/docs/firestore/query-data/indexing
```

## Step 2 — Server-authoritative MVP design

For the cadre-test MVP, the **only client of Firestore is the Next.js server** (via Admin SDK). The browser talks to `/api/*` route handlers, never to Firestore directly.

Consequences:
- Security rules can stay closed (`allow read, write: if false;`) because the Admin SDK bypasses them.
- No need for the Web SDK in the bundle — saves ~100kb.
- Cross-collection updates can be transactional without worrying about partial visibility.

Only deviate (i.e., expose the Web SDK to the client) if you need realtime listeners that can't be modeled as polled fetches.

## Step 3 — Collection design rules

1. **Flat over deep** for the MVP. Top-level `posts/{postId}` with `authorUid` is easier to query than nested `users/{uid}/posts/{postId}`.
2. **Denormalize for read paths.** A post stores `authorDisplayName` and `authorPhotoURL` so the feed is one query. The cost: updating a user's display name doesn't update old posts. For a 60-min MVP, that's fine.
3. **Deterministic doc IDs for uniqueness.** `follows/{follower}_{followee}` makes "is A following B?" a single `doc().get()`, and prevents duplicates without a transaction.
4. **`serverTimestamp()` for ordering fields.** Never trust client-supplied timestamps.

## Step 4 — Cadre-test MVP schema

```ts
// src/types/models.ts
export type User = {
  uid: string;              // Auth0 sub with | -> _
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: FirebaseFirestore.Timestamp;
};

export type Post = {
  id: string;
  authorUid: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  text: string;
  createdAt: FirebaseFirestore.Timestamp;
};
```

## Step 5 — Admin SDK singleton

```ts
// src/lib/firestore/admin.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function init() {
  if (getApps().length) return;
  initializeApp({
    credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS!),
    projectId: process.env.FIRESTORE_PROJECT_ID,
  });
}
init();

export const db = getFirestore();
```

## Step 6 — Typed converters

```ts
// src/lib/firestore/converters.ts
import type { FirestoreDataConverter } from "firebase-admin/firestore";
import type { Post, User } from "@/src/types/models";

export const postConverter: FirestoreDataConverter<Post> = {
  toFirestore(p) {
    const { id: _id, ...rest } = p;
    return rest;
  },
  fromFirestore(snap) {
    return { id: snap.id, ...(snap.data() as Omit<Post, "id">) };
  },
};

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(u) { return u; },
  fromFirestore(snap) { return snap.data() as User; },
};
```

## Step 7 — Queries

```ts
// src/lib/posts/repository.ts
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/src/lib/firestore/admin";
import { postConverter } from "@/src/lib/firestore/converters";

const posts = db.collection("posts").withConverter(postConverter);

export async function createPost(user: { sub: string; name?: string; picture?: string }, text: string) {
  const uid = user.sub.replace(/\|/g, "_");
  const doc = posts.doc();
  const data = {
    id: doc.id,
    authorUid: uid,
    authorDisplayName: user.name ?? "Anonymous",
    authorPhotoURL: user.picture ?? null,
    text,
    createdAt: FieldValue.serverTimestamp() as any,
  };
  await doc.set(data as any);
  return { ...data, createdAt: new Date() };
}

export async function listFeed(limit = 50) {
  const snap = await posts.orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map(d => d.data());
}

export async function listUserPosts(uid: string, limit = 50) {
  const snap = await posts.where("authorUid", "==", uid).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map(d => d.data());
}
```

## Step 8 — Indexes

- Single-field indexes are auto-created.
- Composite (`where` + `orderBy` on different fields) must be created explicitly. Strategy: **let it fail in dev**, then click the link Firestore prints in the error. It takes you to the console with the index pre-filled.

## Common pitfalls

- **Calling `getFirestore()` before `initializeApp()`** — order matters. Use the singleton pattern.
- **Storing `Date` instead of `Timestamp`** — Date works on write but you lose server time. Always `FieldValue.serverTimestamp()` on the server.
- **Returning raw `DocumentSnapshot` to the UI** — leaks Firestore types into React. Always pass plain `T` after `withConverter`.
- **Mixing Admin and Web SDK in the same process** — they have different APIs and types. Pick one per file.
- **Querying without an index** — silent error in some SDKs, loud error in others. Run the failing query once in dev to get the index-creation link.
