# Data Model — Social Network 1.0 (Facebook circa 2004)

Firestore schema, scoped to the 2004 feature set: signup, profile, friends, wall, poke, messages, groups, search. All writes go through the Admin SDK in `src/lib/{domain}/repository.ts`; clients call `/api/*` only.

Scope flags:
- **P0** — MVP, must ship.
- **P1** — stretch within the hour.
- **P2** — post-interview.

## User stories → collections

| # | Story | Touches |
|---|---|---|
| 1 | Sign up with Google, land on feed | `users` |
| 2 | Fill out profile (status, basic, academic, social, favorites, about) | `users` |
| 3 | Search for someone by name | `users` (via `nameTokens`) |
| 4 | Send a friend request; accept or reject | `friendRequests` → `friendships` |
| 5 | Post on a friend's wall | `wallPosts` |
| 6 | See friends' wall activity on my feed | `wallPosts` (read across friends) |
| 7 | Poke another user; see who poked me | `pokes` |
| 8 | Send and receive private messages | `conversations`, `conversations/{id}/messages` (P1) |
| 9 | Create/join a group and post on its wall | `groups`, `groups/{id}/members`, `groups/{id}/wallPosts` (P2) |

## Collections

### `users/{uid}` — P0

`uid` = Auth0 `sub` with `|` replaced by `_`.

```ts
type User = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // 2004 one-liner ("Mark is thinking about…")
  status: string | null;
  // optional self-declared network (e.g. "harvard", "stanford"); no enforcement
  network: string | null;
  basic: {
    sex: "male" | "female" | "other" | null;
    birthday: string | null;       // ISO yyyy-mm-dd
    hometown: string | null;
    currentResidence: string | null;
    phone: string | null;
    aim: string | null;
    website: string | null;
  };
  academic: {
    classYear: number | null;
    concentration: string | null;
    highSchool: string | null;
    courses: string[];             // free-text tags
  };
  social: {
    relationshipStatus:
      | "single" | "in_relationship" | "engaged"
      | "married" | "its_complicated" | null;
    interestedIn: "men" | "women" | "both" | null;
    lookingFor: Array<
      "friendship" | "dating" | "random_play" | "whatever_i_can_get"
    >;
    politicalViews: string | null;
    religiousViews: string | null;
  };
  favorites: {
    books: string | null;
    movies: string | null;
    music: string | null;
    tv: string | null;
    quotes: string | null;
  };
  aboutMe: string | null;
  // search index, denormalized
  displayNameLower: string;
  nameTokens: string[];            // lowercased prefix tokens for array-contains
  // counters maintained transactionally
  counts: {
    friends: number;
    wallPosts: number;             // posts ON this user's wall
    pokesReceived: number;         // unacknowledged
  };
};
```

**Indexes:** single-field on `displayNameLower` (asc); array on `nameTokens`; optional composite `(network ASC, displayNameLower ASC)` for in-network browse.

### `friendRequests/{fromUid_toUid}` — P0

Composite doc ID gives free uniqueness: you can't send two pending requests to the same person.

```ts
type FriendRequest = {
  fromUid: string;
  toUid: string;
  fromDisplayName: string;         // denormalized for inbox render
  fromPhotoURL: string | null;
  createdAt: Timestamp;
  message: string | null;          // optional intro text
};
```

On **accept**: transaction deletes this doc, writes `friendships/{minUid_maxUid}`, and increments both users' `counts.friends`. On **reject**: delete this doc.

### `friendships/{minUid_maxUid}` — P0

Sorted pair: `min(a,b)` underscore `max(a,b)`. Single doc per friendship, no duplicates possible.

```ts
type Friendship = {
  userA: string;                   // = minUid
  userB: string;                   // = maxUid
  since: Timestamp;
};
```

**Reads:**
- My friends = `where userA == me` ∪ `where userB == me`. Two queries, merge client-side, dedupe by the *other* uid.
- (Optional denorm: also write `users/{uid}/friends/{otherUid}` subcollection docs for one-shot reads, kept in sync inside the same transaction. P1.)

### `wallPosts/{postId}` — P0

```ts
type WallPost = {
  id: string;
  wallOwnerUid: string;            // whose wall it sits on
  authorUid: string;
  authorDisplayName: string;       // denormalized
  authorPhotoURL: string | null;
  text: string;                    // 1–500 chars, validated server-side
  createdAt: Timestamp;
  deletedAt: Timestamp | null;
};
```

**Reads:**
- Profile wall: `where wallOwnerUid == X and deletedAt == null order by createdAt desc limit 50`.
- Landing feed (friends' activity): get my friend uids → `where wallOwnerUid in [...friendUids] order by createdAt desc limit 50`. Firestore `in` caps at 30 values; if more than 30 friends, batch the reads.

**Indexes:** composite `(wallOwnerUid ASC, deletedAt ASC, createdAt DESC)`.

**Write rules:**
- Only friends of `wallOwnerUid` (or the owner themselves) may write a wall post.
- Enforced in `src/lib/wall-posts/create-wall-post.ts` before the Firestore write.

### `pokes/{pokeId}` — P0

Auto-ID. Doc-per-poke so "poke back" and "who poked me" work.

```ts
type Poke = {
  id: string;
  fromUid: string;
  fromDisplayName: string;         // denormalized
  toUid: string;
  createdAt: Timestamp;
  acknowledged: boolean;           // true once recipient has seen the inbox
};
```

**Reads:** notification badge = `where toUid == me and acknowledged == false count()`.

**Indexes:** composite `(toUid ASC, acknowledged ASC, createdAt DESC)`.

**TTL (P2):** auto-purge acknowledged pokes older than 7 days via a Firestore TTL policy on a separate `acknowledgedAt` field.

### `conversations/{convId}` — P1

`convId` = `${minUid}_${maxUid}` for 1:1, making upserts idempotent.

```ts
type Conversation = {
  id: string;
  participants: [string, string];
  lastMessageAt: Timestamp;
  lastMessageText: string;
  lastMessageFromUid: string;
  unread: { [uid: string]: number };
};
```

### `conversations/{convId}/messages/{msgId}` — P1

```ts
type Message = {
  id: string;
  fromUid: string;
  text: string;
  createdAt: Timestamp;
  readBy: string[];                // uids
};
```

**Indexes:** default ordering on `createdAt` is sufficient.

### `groups/{groupId}` — P2

```ts
type Group = {
  id: string;
  name: string;
  description: string;
  ownerUid: string;
  photoURL: string | null;
  createdAt: Timestamp;
  counts: { members: number; posts: number };
};
```

### `groups/{groupId}/members/{uid}` — P2

```ts
type GroupMember = {
  uid: string;
  joinedAt: Timestamp;
  role: "admin" | "member";
};
```

### `groups/{groupId}/wallPosts/{postId}` — P2

Same shape as the top-level `wallPosts` but scoped under the group. Don't reuse the top-level collection; keep group walls separate so queries stay simple.

## Denormalization summary

| Where | What's denormalized | Why |
|---|---|---|
| `wallPosts` | `authorDisplayName`, `authorPhotoURL` | Render wall in one query |
| `friendRequests` | `fromDisplayName`, `fromPhotoURL` | Render inbox in one query |
| `pokes` | `fromDisplayName` | Render poke list in one query |
| `users.counts.*` | friend / wallPost / poke counts | Profile header without N reads |
| `users.nameTokens` | lowercased prefix tokens of `displayName` | Array-contains search |

**Sync rule:** when a user updates `displayName` or `photoURL`, kick off a background re-denormalization across `wallPosts`, `friendRequests`, `pokes`, and `conversations.last*`. For the MVP, skip the back-propagation and accept staleness; revisit if a demo question lands on it.

## Indexes summary

```
users:           (network ASC, displayNameLower ASC)
                 nameTokens array
wallPosts:       (wallOwnerUid ASC, deletedAt ASC, createdAt DESC)
pokes:           (toUid ASC, acknowledged ASC, createdAt DESC)
friendships:     single-field (userA ASC), (userB ASC)
friendRequests:  single-field (toUid ASC, createdAt DESC)
```

Let Firestore print the index-creation links the first time a query fails — copy-paste, accept, move on.

## Security rules

All access via Admin SDK from `src/lib/`. Client-side Web SDK is **not** exposed. Rules can stay closed (`allow read, write: if false;`) for the MVP. When realtime listeners get added for the feed (P2), open up *read-only* on the specific paths with rules that mirror the server-side authorization (e.g., wallPost read iff requester is friend of `wallOwnerUid`).
