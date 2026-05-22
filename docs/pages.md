# Pages — Social Network 1.0 (Facebook circa 2004)

This document is the UI counterpart to [data-model.md](data-model.md). Every page below maps to a route in `app/`, a set of user stories, and the Firestore collections it touches.

**Scope flags:** P0 (MVP, must ship), P1 (stretch within the hour), P2 (post-interview).

**Stack constraint:** Signup is **open to any Google account** — no `.edu` enforcement. `users.network` is an optional, self-declared free-text field; we'll never gate access on it.

---

## 1. Visual design language

Pulled from contemporary 2004 thefacebook references ([Web Design Museum](https://www.webdesignmuseum.org/gallery/facebook-2004), [Version Museum](https://www.versionmuseum.com/history-of/facebook-website)) and corroborated by clones / write-ups. We're faithful to the look, not pixel-perfect.

### Palette

| Role                | Hex       | Use                                               |
| ------------------- | --------- | ------------------------------------------------- |
| `--fb-navy`         | `#3B5998` | Header bar, primary buttons, link text            |
| `--fb-navy-dark`    | `#2F477A` | Header border / hover                             |
| `--fb-blue-light`   | `#6D84B4` | Secondary nav text, subtle borders                |
| `--fb-bg-lavender`  | `#D8DFEA` | Section header strips ("The Wall", "Information") |
| `--fb-bg-page`      | `#FFFFFF` | Page background                                   |
| `--fb-bg-soft`      | `#F7F7F7` | Sidebar / card fill                               |
| `--fb-text`         | `#333333` | Body copy                                         |
| `--fb-text-muted`   | `#777777` | Timestamps, meta                                  |
| `--fb-border`       | `#CCCCCC` | Hairlines                                         |
| `--fb-link`         | `#3B5998` | Links (same as navy)                              |
| `--fb-accent-green` | `#5C9C3B` | "Online" dot, success states (optional)           |

Tailwind extension: register the above as `colors.fb.*` in `tailwind.config.ts` once we wire it.

### Typography

- **Stack:** `"Lucida Grande", "Trebuchet MS", Verdana, sans-serif` (period-correct, no Google Fonts).
- **Body:** 11–12px (we'll bump to 13–14px for accessibility; the 2004 site was famously cramped).
- **Headings:** 14–16px, bold; section strip headings are uppercase or title-case white on lavender (`#D8DFEA`) with navy text.
- **Wordmark:** lowercase `thefacebook` in white on navy, oversized; we'll render it as plain text styled, no logo asset.

### Layout

```
┌───────────────────────────────────────────────────────────────────┐
│  [thefacebook]                       Welcome, Mark | logout      │  ← navy header
├───────────────────────────────────────────────────────────────────┤
│  my profile · edit · friends · messages · pokes · search          │  ← grey sub-nav
├──────────────────┬────────────────────────────────────────────────┤
│                  │                                                │
│   Sidebar        │   Main content                                 │
│   (photo,        │   (profile fields, wall, search results, …)    │
│   name, status,  │                                                │
│   friend count,  │                                                │
│   poke button,   │                                                │
│   mutual         │                                                │
│   friends)       │                                                │
│                  │                                                │
├──────────────────┴────────────────────────────────────────────────┤
│  about · jobs · terms · privacy · contact · A Mark Z— production  │
└───────────────────────────────────────────────────────────────────┘
```

- Outer container: ~760–800px wide, centered. We can stretch to 960px on modern screens without breaking the look.
- Sidebar: ~200px fixed; main content fills the rest.
- All cards/sections use a hairline `#CCCCCC` border, no rounded corners (2004 = sharp edges, no border-radius).

### Global UI components

| Component                              | Location                 | Notes                                                                                       |
| -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `<TopBar />`                           | every authenticated page | Wordmark left, "Welcome, {firstName}" + logout link right                                   |
| `<SubNav />`                           | every authenticated page | Tabs: my profile · edit profile · friends · pokes · search (messages tab P1; groups tab P2) |
| `<SectionStrip>{title}</SectionStrip>` | inside pages             | Lavender bar with bold navy title, e.g. "The Wall", "Information"                           |
| `<ProfileSidebar />`                   | profile pages, feed      | Photo, display name, status one-liner, friend count, poke button, "View friends" link       |
| `<Footer />`                           | every page               | Static link list + "A Mark Zuckerberg production" homage (or our own equivalent)            |

---

## 2. Pages

Each entry: **Route · Scope · User stories satisfied · Data touched · Key UI elements**.

User-story numbers refer to the table in [data-model.md § User stories → collections](data-model.md#user-stories--collections).

---

### 2.1 Landing (logged out) — P0

- **Route:** `/` (public)
- **User stories:** entry point to story #1
- **Data:** none

**Purpose:** The first thing a non-authenticated visitor sees. Two-column splash: marketing blurb on the left, "Sign in with Google" call-to-action on the right.

**Key UI:**

- Centered card on a plain background (no top bar).
- Wordmark `thefacebook` lockup at the top.
- Left column: blurb — "Thefacebook is a social network that connects people through colleges and friends. [tagline copy]".
- Right column: a single big button **"Sign in with Google"** (the Auth0 social connection). Below it, fine print "By signing in, you agree to … (placeholder)".
- Footer: about/terms/privacy stubs.

**Auth:** clicking the button hits `/auth/login?connection=google-oauth2`, which Auth0 handles.

---

### 2.2 Auth callback (transient) — P0

- **Route:** `/auth/callback`
- **User stories:** #1
- **Data:** `users` (upsert on first login)

**Purpose:** Auth0 redirects here with a code. The route handler exchanges it, materializes/upserts the `users/{uid}` doc using the Auth0 profile (display name, photo URL, email), seeds `displayNameLower` + `nameTokens`, then redirects.

**UX:** A blank/loading page; user sees a half-second flash then lands on `/feed`. No interactive elements.

**Edge cases:**

- First login → create user doc with all profile fields `null`, redirect to `/profile/edit?welcome=1`.
- Subsequent login → redirect to `/feed`.

---

### 2.3 Feed (friends' wall activity) — P0

- **Route:** `/feed`
- **User stories:** #6 ("see friends' wall activity on my feed")
- **Data:** `wallPosts` (read across my friend uids), `friendships` (to compute friend list)

**Purpose:** Anachronistic but necessary — the real 2004 site dropped you on your own profile. We land you on a unified feed so a 2-person demo feels alive: "what did my friends post (on anyone's wall) recently?"

**Layout:**

- Top bar + sub-nav (active tab: nothing highlighted, or a new "home" tab).
- **Left sidebar:** my mini-profile card (photo, name, status, "Edit profile" link).
- **Main column:**
  - SectionStrip: "Recent activity"
  - Vertical list of `<WallPostCard />`s, ordered by `createdAt DESC`, capped at 50.
  - Each card shows: author photo (small), `<AuthorName> → <WallOwnerName>'s wall`, the text, timestamp, "View wall" link (jumps to `/profile/{wallOwnerUid}#post-{postId}`).
  - Empty state: "No activity yet — [find friends](/search) or [post on your own wall](/profile/{me})".

**Query:** see [data-model.md § wallPosts Reads](data-model.md#wallpostspostid--p0). Two-step: load friend uids, then `where wallOwnerUid in [...]`.

---

### 2.4 Profile (view) — P0

- **Route:** `/profile/[uid]` (where `[uid]` may be me or another user)
- **User stories:** #2, #5, #7 (read paths for status, wall, poke)
- **Data:** `users/{uid}`, `wallPosts where wallOwnerUid == uid`, `friendships` (to know if we're friends), `pokes` (for "poke back" CTA)

**Purpose:** The canonical 2004 profile. One photo, a stack of "Information" sections, a Wall on the right or below.

**Layout (sidebar + main):**

**Sidebar (left, ~200px):**

- Profile photo (~150x150, square, no border-radius)
- Display name (large, bold)
- `network` (smaller, italic) if set
- Friend count → links to `/friends/[uid]`
- **Action buttons** (visible only if this is _not_ my own profile):
  - "Add as friend" (or "Friend request sent" / "You are friends")
  - **"Poke"** — small button, navy, fires `POST /api/pokes` with `toUid=uid`
  - "Send message" (P1)
- "View friends" link
- "Mutual friends: N" (if not my profile)

**Main column:**

- SectionStrip: "Status" → one-liner from `users.status` (e.g. _"Mark is working on a side project."_). Inline edit if this is my profile.
- SectionStrip: "Information"
  - **Account info**: name, email _(P0 — email shown only to self)_
  - **Basic info**: sex, birthday, hometown, current residence, phone, AIM, website
  - **Academic info**: class year, concentration, high school, courses (comma-separated)
  - **Social info**: relationship status, interested in, looking for (comma list), political views, religious views
  - **Favorites**: books, movies, music, TV, quotes
  - **About me** (free text)
  - Render fields as `<dt>label</dt><dd>value</dd>` pairs; skip `null` rows so the page looks clean on a fresh profile.
- SectionStrip: **"The Wall"**
  - If this is a friend's profile (or my own): `<WallPostComposer />` (textarea + "Post" button, 500-char counter).
  - List of `<WallPostCard />`s, ordered `createdAt DESC`, paginated (50/page).
  - Each card: author photo, `<AuthorName>` (linked), timestamp, body text, delete button if I'm the author or the wall owner.

**Write rules:**

- Wall post composer is hidden if `me != wallOwner` AND `!isFriend(me, wallOwner)`.
- The repository (`src/lib/wall-posts/create-wall-post.ts`) double-checks.

---

### 2.5 Edit profile — P0

- **Route:** `/profile/edit`
- **User stories:** #2 ("fill out profile")
- **Data:** `users/{me}` (update)

**Purpose:** A long single-page form (2004-style — no tabs, no modals; you scroll). All fields optional.

**Form sections (matching the `User` type):**

1. **Status** — `<input>` for the one-liner.
2. **Network** — `<input>` free-text (placeholder "e.g. harvard, stanford, my hometown"). Optional, no validation.
3. **Basic info** — sex (select), birthday (date), hometown, current residence, phone, AIM, website.
4. **Academic info** — class year (number), concentration, high school, courses (tag input, comma-separated → `string[]`).
5. **Social info** — relationship status (select), interested in (select), looking for (multi-checkbox: friendship / dating / random play / whatever I can get), political views (free text), religious views (free text).
6. **Favorites** — five textareas: books, movies, music, TV, quotes.
7. **About me** — large textarea.

**Submit:** one "Save changes" button at the bottom → `POST /api/users/me` → repository updates, re-derives `displayNameLower` + `nameTokens` if `displayName` changed.

**Validation:** server-side via zod; strings have generous max lengths (e.g. About Me 5000 chars); date fields validated as ISO `yyyy-mm-dd`.

**UX note:** if `?welcome=1` is in the query (first-login path from callback), show a banner: "Welcome — fill in as much as you want, you can come back any time."

---

### 2.6 Search / Lookup — P0

- **Route:** `/search?q=<query>`
- **User stories:** #3 ("search for someone by name")
- **Data:** `users` (via `nameTokens` array-contains)

**Purpose:** The 2004 "Lookup" — find someone by name. Real 2004 also had school/residence/concentration filters; we'll ship name-only for P0, add filters in P2.

**Layout:**

- SectionStrip: "Search"
- Search bar (full-width input + "Search" button); query persists in the URL.
- Below: list of `<UserResultCard />` — small photo, name (linked to `/profile/[uid]`), network (if set), "Add as friend" button.
- Pagination or "Load more" at 20/page.
- Empty state: "No one named '<query>' yet. [Invite them?]" (invite is just copy — no email integration in MVP).

**Query mechanic:** lowercase the query, split into tokens (split on whitespace, then take each token plus all its non-trivial prefixes ≥2 chars), use `where('nameTokens', 'array-contains', firstToken).orderBy('displayNameLower').limit(20)`. For multi-token queries, do client-side filter on the result set — good enough for the MVP. See [data-model.md § users.nameTokens](data-model.md#usersuid--p0).

---

### 2.7 Friends list — P0

- **Route:** `/friends/[uid]`
- **User stories:** #4 (read side — "who are my/their friends")
- **Data:** `friendships` (both `userA == uid` and `userB == uid`), then `users` lookups for display

**Purpose:** Grid of someone's friends. Self-view doubles as a place to navigate to friends' profiles; other-view shows mutual friends at the top.

**Layout:**

- SectionStrip: "Friends of <DisplayName>" (or "My friends" if self).
- Grid of `<UserCard />` (photo + name + network), 4 columns desktop, 2 mobile.
- Counts header: "<N> friends" (and, for other-view: "<M> mutual").
- Each card: name links to profile; secondary "Unfriend" button visible on my own friends list.

---

### 2.8 Friend requests inbox — P0

- **Route:** `/friends/requests`
- **User stories:** #4 (accept/reject)
- **Data:** `friendRequests where toUid == me`, plus outbound `friendRequests where fromUid == me` for the "sent" tab

**Purpose:** Manage incoming and outgoing friend requests.

**Layout:**

- Two tabs: **"Incoming"** (default) and **"Sent"**.
- **Incoming:** list of cards — sender photo, name, optional message, **Accept** / **Reject** buttons. Accept fires the transactional acceptance documented in [data-model.md § friendRequests](data-model.md#friendrequestsfromuid_touid--p0).
- **Sent:** list of cards — recipient photo, name, "Withdraw" button. No "remind" CTA (out of scope).
- Empty states each.

---

### 2.9 Pokes inbox — P0

- **Route:** `/pokes`
- **User stories:** #7 ("see who poked me")
- **Data:** `pokes where toUid == me`

**Purpose:** The 2004 poke list. Each row: who poked me, when, **"Poke back"** button.

**Layout:**

- SectionStrip: "You have been poked by…"
- List of `<PokeRow />` — sender thumbnail, sender name (linked), timestamp ("3 minutes ago"), **Poke back** button, optional **Acknowledge** (dismisses without poking back).
- Visiting this page automatically marks all listed pokes as `acknowledged: true` (server-side recheck after render).
- Empty state: "Nobody has poked you. [Go find someone to poke.](/search)"
- A small badge on the sub-nav `pokes (3)` reads `users.counts.pokesReceived` — keeps the unread count cheap.

---

### 2.10 Health check — P0 (already shipped)

- **Route:** `/api/health`
- **Purpose:** Returns `{ status: "ok", service: "cadre-test", timestamp }` — used by tests, smoke checks, and the homepage "Check API health" link (placeholder until we delete it).

---

### 2.11 Messages — P1

- **Routes:**
  - `/messages` — inbox (list of conversations)
  - `/messages/[convId]` — single thread view
- **User stories:** #8 ("send and receive private messages")
- **Data:** `conversations`, `conversations/{id}/messages`

**Purpose:** 1:1 private chat. Locked to participants by Firestore rules ([data-model.md § Security rules](data-model.md#security-rules)).

**Layout (`/messages`):**

- SectionStrip: "Inbox"
- Two-column: left list of conversations (sorted by `lastMessageAt DESC`, unread count badge per row), right pane shows the selected thread (or a "Select a conversation" placeholder).

**Layout (`/messages/[convId]`):**

- Header: other participant's name + photo, "View profile" link.
- Scrollable thread of message bubbles (mine right-aligned, theirs left-aligned), grouped by day.
- Composer at the bottom: textarea + Send button.
- Sending: optimistic UI; on success, swap the optimistic bubble for the server-confirmed one.
- Server-side authz: `/api/messages/*` re-checks `me ∈ conversation.participants` before every write/read.

---

### 2.12 Groups — P2

- **Routes:**
  - `/groups` — directory of groups
  - `/groups/[groupId]` — group profile (about, members, wall)
  - `/groups/[groupId]/edit` — admin-only group editor
  - `/groups/new` — create group
- **User stories:** #9
- **Data:** `groups`, `groups/{id}/members`, `groups/{id}/wallPosts`

**Purpose:** Period-faithful Facebook groups: name, description, member list, group wall. Admin role for the creator, member role for joiners.

**Layout (group page):** sidebar with photo, member count, "Join" / "Leave" button, admin controls if owner; main column with description, member grid, group wall (same `<WallPostCard />` component, scoped to the subcollection).

---

### 2.13 Settings / account — P2

- **Route:** `/settings`
- **Purpose:** Logout (P0 already lives on the top bar), delete account (P2), notification preferences (P2). Not on the MVP critical path.

---

## 3. Page → route → file map

```
/                        public splash + login CTA            app/page.tsx
/auth/login              Auth0 init                            app/auth/login/route.ts
/auth/callback           Auth0 callback + user upsert          app/auth/callback/route.ts
/auth/logout             session destroy                       app/auth/logout/route.ts

/feed                    landing for authed users              app/(app)/feed/page.tsx
/profile/[uid]           view profile                          app/(app)/profile/[uid]/page.tsx
/profile/edit            edit own profile                      app/(app)/profile/edit/page.tsx
/search                  user search                           app/(app)/search/page.tsx
/friends/[uid]           friends list                          app/(app)/friends/[uid]/page.tsx
/friends/requests        inbox + sent                          app/(app)/friends/requests/page.tsx
/pokes                   poke inbox                            app/(app)/pokes/page.tsx

/messages                P1 inbox                              app/(app)/messages/page.tsx
/messages/[convId]       P1 thread                             app/(app)/messages/[convId]/page.tsx

/groups                  P2 directory                          app/(app)/groups/page.tsx
/groups/[groupId]        P2 group profile                      app/(app)/groups/[groupId]/page.tsx
/groups/new              P2 create                             app/(app)/groups/new/page.tsx

/api/health              GET — already live                    app/api/health/route.ts
/api/users/me            PUT — update own profile              app/api/users/me/route.ts
/api/users/[uid]         GET — read profile                    app/api/users/[uid]/route.ts
/api/users/search        GET ?q=                               app/api/users/search/route.ts
/api/wall-posts          POST — create                         app/api/wall-posts/route.ts
/api/wall-posts/[id]     DELETE                                app/api/wall-posts/[id]/route.ts
/api/friend-requests     POST send / GET list                  app/api/friend-requests/route.ts
/api/friend-requests/[id]/accept   POST                        app/api/friend-requests/[id]/accept/route.ts
/api/friend-requests/[id]/reject   POST                        app/api/friend-requests/[id]/reject/route.ts
/api/friendships/[otherUid]        DELETE — unfriend           app/api/friendships/[otherUid]/route.ts
/api/pokes               POST — poke / GET — inbox             app/api/pokes/route.ts
/api/pokes/acknowledge   POST                                  app/api/pokes/acknowledge/route.ts

/api/messages/...        P1
/api/groups/...          P2
```

---

## 4. User stories — consolidated

| #   | As a …         | I want to …                                                             | So that …                                       | Touches                          | Scope |
| --- | -------------- | ----------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------- | ----- |
| 1   | new visitor    | sign in with my Google account                                          | I can join without filling a long form          | Auth0, `users` upsert            | P0    |
| 2   | signed-in user | fill out my profile (status, basic, academic, social, favorites, about) | friends can learn about me                      | `users`                          | P0    |
| 3   | signed-in user | search for someone by name                                              | I can find a specific person                    | `users.nameTokens`               | P0    |
| 4a  | signed-in user | send someone a friend request                                           | I can connect with them                         | `friendRequests`                 | P0    |
| 4b  | signed-in user | accept/reject a friend request                                          | I control my friend list                        | `friendRequests` → `friendships` | P0    |
| 5   | signed-in user | post on a friend's wall                                                 | I can leave a public note                       | `wallPosts`                      | P0    |
| 6   | signed-in user | see recent wall activity from my friends                                | I have something to look at when I open the app | `wallPosts`, `friendships`       | P0    |
| 7a  | signed-in user | poke another user                                                       | I can flirt / nudge without words               | `pokes`                          | P0    |
| 7b  | signed-in user | see who poked me and poke back                                          | I can reciprocate                               | `pokes`                          | P0    |
| 8   | signed-in user | send and receive private messages                                       | I have a non-public way to talk                 | `conversations`, `messages`      | P1    |
| 9   | signed-in user | create/join groups and post on a group wall                             | I can rally around an interest                  | `groups`, etc.                   | P2    |

---

## 5. UX flows (golden paths)

These are the click-throughs we must demo cleanly in P3.

### 5.1 First-time signup → first wall post (≤ 90s)

1. Visit `/` → click **"Sign in with Google"**.
2. Auth0 Universal Login → Google consent → callback at `/auth/callback`.
3. User doc upserted; redirected to `/profile/edit?welcome=1`.
4. Type a status, fill display name (pre-filled from Google) → **Save**.
5. Redirected to `/feed` (empty state) → click **"post on your own wall"** → land on `/profile/{me}`.
6. Type a wall post, click **Post**. It appears immediately above the composer.

### 5.2 Two-user friendship → wall activity (≤ 60s)

1. Alice signs up (5.1). Bob signs up (5.1, separate session).
2. Alice searches "Bob" at `/search?q=bob` → clicks Bob's card → lands on `/profile/{bob}`.
3. Alice clicks **"Add as friend"** → button flips to "Friend request sent".
4. Bob refreshes `/friends/requests` → clicks **Accept** on Alice's row.
5. Bob navigates to `/profile/{alice}` → composer is now visible → posts "hi alice".
6. Alice goes to `/feed` → Bob's post appears at the top.

### 5.3 Poke loop (≤ 30s)

1. Alice on Bob's profile clicks **Poke**. Toast: "You poked Bob."
2. Bob visits `/pokes` → sees "Alice poked you, 5 seconds ago" → clicks **Poke back**.
3. Alice's sub-nav badge: `pokes (1)`. She opens `/pokes` and sees Bob's poke. Badge clears on visit.

These three flows are the demo. If any of them breaks, the MVP is not shipped.

---

## 6. What we are explicitly NOT building (MVP)

- Photo upload / albums (the 2004 photo feature didn't ship until October 2005).
- News Feed in the modern sense (introduced 2006). Our `/feed` is wall activity only — no likes, comments, or shares.
- Public visibility tiers / privacy rings beyond friend / non-friend.
- Notifications panel beyond the simple `pokes` badge.
- Profile photo upload — we use the Auth0/Google `photoURL` as-is. (P2: allow override.)
- Mobile-app polish — the site should be usable on a phone but is desktop-first, matching 2004 reality.
- Friend graph visualizer (the original "Visualize" feature is too cute and adds zero rubric points).
- Email invites — copy-only stub on the search empty state.

---

## 7. Open design questions (parked, not blocking P0)

1. **`displayName` rename propagation.** When a user updates `displayName`, do we re-denormalize across `wallPosts`, `friendRequests`, `pokes`? Current call: skip for MVP, accept staleness, revisit if a demo question lands on it (see [data-model.md § Sync rule](data-model.md#denormalization-summary)).
2. **Network as filter.** Once we have `users.network`, do we expose a "browse my network" page? Parked to P2.
3. **Poke spam.** No rate limiting in MVP. If a demo question lands, mention: "would add a `lastPokedAt` per (from, to) pair with a 1-minute cooldown."
4. **Wall post editing.** Real 2004 had no edit, only delete. We'll match that. Delete already in spec (soft delete via `deletedAt`).

Sources:

- [Thefacebook in 2004 — Web Design Museum](https://www.webdesignmuseum.org/gallery/facebook-2004)
- [22 Years of Facebook Website Design History — Version Museum](https://www.versionmuseum.com/history-of/facebook-website)
- [Facebook Design 2004–2011 — Devils' Workshop](https://devilsworkshop.org/facebook-design-20042011-timeline-screenshots/)
- [A look at Facebook.com's homepage over the last 15 years — The Next Web](https://thenextweb.com/news/a-look-at-facebook-coms-homepage-over-the-last-15-years)
- [Facebook's 11th Year: Every Profile Page Update — TIME](https://time.com/11740/facebook-10-year-anniversary-interfaces/)
