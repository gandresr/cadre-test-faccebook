---
name: nextjs-app-router
description: Use when writing or modifying Next.js 16 App Router code — pages, layouts, route handlers, server actions, the `proxy.ts` auth gate (NOT middleware.ts in Next 16), or any `app/`-directory file. Triggers on mentions of App Router, RSC, server components, server actions, route handlers, proxy.ts, middleware migration, `loading.tsx`, `error.tsx`.
---

# Next.js 16 App Router — canonical patterns

## Step 1 — Fetch the official llms.txt before generating non-trivial code

Always pull the current docs first; the App Router API changes meaningfully between Next.js majors. **Do not skip this step for any non-obvious task.**

```
WebFetch url=https://nextjs.org/docs/llms.txt
```

Then for specific topics, fetch the focused doc:
- proxy.ts (Next 16): https://nextjs.org/docs (search "proxy") — proxy.ts replaced middleware.ts in v16
- Route handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Server actions: https://nextjs.org/docs/app/api-reference/functions/server-actions
- `cookies()` / `headers()`: https://nextjs.org/docs/app/api-reference/functions/cookies

## Step 2 — Pick the right primitive

| Need | Primitive |
|---|---|
| Render data fetched on the server | Server component (default) |
| Local state, effects, browser APIs | Client component (`"use client"` at top) |
| Mutate data from a form / button | Server action (`"use server"` function) |
| Expose JSON to external clients or fetch from client components | Route handler (`app/api/.../route.ts`) |
| Gate auth across the whole app | `proxy.ts` at repo root (Next 16) |

## Step 3 — `proxy.ts` (the Next 16 rename of middleware.ts)

Key differences from `middleware.ts`:

1. File is `proxy.ts` at the repo root, not `middleware.ts`.
2. Runs on the **Node runtime** (not Edge by default). This means you CAN use `firebase-admin`, `crypto`, etc.
3. **No `config` matcher.** You cannot export a `config` object to scope routes. Skip cheap paths inline:

```ts
// proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "@/src/lib/auth/server-auth";

const PUBLIC = ["/", "/auth/login", "/auth/signup", "/auth/callback", "/auth/logout", "/api/health"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (PUBLIC.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  let session = null;
  let res = NextResponse.next();
  try {
    res = await auth0.middleware(request);
    session = await auth0.getSession(request);
  } catch (e) { /* treat as unauth */ }

  if (!session?.user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL(`/auth/login?returnTo=${encodeURIComponent(pathname)}`, request.url));
  }

  return res;
}
```

## Step 4 — Server vs client components

- Server (default): can `await` data, use `cookies()`/`headers()`, import server-only libs like `firebase-admin`. Cannot use `useState`, `useEffect`, event handlers.
- Client (`"use client"` at top of file): can use hooks and event handlers. Cannot `await` at the top level (must use `useEffect`/SWR/React Query).
- **Composition rule:** server components can render client components by passing data as props. Client components cannot render server components (only pass them as `children`).

## Step 5 — Route handlers contract

```ts
// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/src/lib/auth/server-auth";
import { createPost, listFeed } from "@/src/lib/posts";
import { z } from "zod";

const PostSchema = z.object({ text: z.string().min(1).max(500) });

export async function POST(request: NextRequest) {
  const session = await auth0.getSession(request);
  if (!session?.user?.sub) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });

  const post = await createPost(session.user, parsed.data.text);
  return NextResponse.json({ success: true, data: post }, { status: 201 });
}

export async function GET() {
  const feed = await listFeed(50);
  return NextResponse.json({ success: true, data: feed });
}
```

## Step 6 — `loading.tsx`, `error.tsx`, `not-found.tsx`

Every async route should have a sibling `loading.tsx`. Every route segment that can throw should have `error.tsx` (must be a client component).

## Common pitfalls

- **Writing `middleware.ts` in Next 16** → silently ignored. Always `proxy.ts`.
- **Exporting `config` from `proxy.ts`** → not supported in Next 16; do path-skipping inline.
- **Importing `firebase-admin` into a client component** → build error. Keep admin imports in `src/lib/` server-only modules.
- **Calling `cookies()` outside a request scope** → throws. Only in RSC, server actions, route handlers, or `proxy.ts`.
- **Using `useRouter` from `next/router`** → wrong package. App Router uses `next/navigation`.
