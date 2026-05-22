---
name: testing-strategy
description: Use when writing or debugging tests for the Next.js + Auth0 + Firestore stack — Jest unit tests, route-handler tests, Firestore emulator integration tests, Playwright E2E. Triggers on mentions of tests, Jest, RTL, Firestore emulator, Playwright, coverage, flaky test, mocking.
---

# Testing strategy — 60-min MVP cut

## Step 1 — Priority order (write tests in THIS order)

1. **Pure functions** — `sanitizeAuthReturnTo`, validators, denormalization helpers, converters. Fast, deterministic, high ROI.
2. **Route handlers with mocked auth + emulated Firestore.** Real wire-format, real query, fake user.
3. **`proxy.ts` decision table.** Public/protected paths, with/without session, page vs API.
4. **One E2E smoke** — Playwright, only after MVP is in the browser.

**Skip for the MVP:** snapshot tests of Tailwind components, Firebase SDK behavior, Auth0 SDK behavior.

## Step 2 — Jest config

```js
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",                       // node by default; jsdom for component tests
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  projects: [
    { displayName: "unit", testMatch: ["<rootDir>/src/**/*.test.ts"] },
    { displayName: "components", testEnvironment: "jsdom", testMatch: ["<rootDir>/app/**/*.test.tsx"] },
    { displayName: "integration", testMatch: ["<rootDir>/{app,src}/**/*.integration.test.{ts,tsx}"] },
  ],
};
```

## Step 3 — Firestore emulator for integration tests

```bash
# One-time
npm i -g firebase-tools
firebase init firestore   # accept defaults

# Per-run
firebase emulators:start --only firestore  # in one terminal
FIRESTORE_EMULATOR_HOST=localhost:8080 \
  FIRESTORE_PROJECT_ID=demo-cadre \
  npm run test:integration
```

The Admin SDK picks up `FIRESTORE_EMULATOR_HOST` automatically — no code change needed.

## Step 4 — Mocking Auth0 in tests

```ts
// tests/_helpers/mock-auth0.ts
export function mockSession(overrides: Partial<Auth0User> = {}) {
  return {
    user: {
      sub: "auth0|test-user-1",
      email: "test@example.com",
      name: "Test User",
      picture: null,
      email_verified: true,
      ...overrides,
    },
  };
}

// In a test:
jest.mock("@/src/lib/auth/server-auth", () => ({
  auth0: { getSession: jest.fn() },
}));
import { auth0 } from "@/src/lib/auth/server-auth";
(auth0.getSession as jest.Mock).mockResolvedValue(mockSession());
```

## Step 5 — Route handler test pattern

```ts
// app/api/posts/route.test.ts
import { POST } from "./route";
import { NextRequest } from "next/server";

it("creates a post when authenticated", async () => {
  (auth0.getSession as jest.Mock).mockResolvedValue(mockSession());
  const req = new NextRequest("http://localhost/api/posts", {
    method: "POST",
    body: JSON.stringify({ text: "hello world" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(201);
  const json = await res.json();
  expect(json.success).toBe(true);
  expect(json.data.text).toBe("hello world");
});

it("returns 401 without a session", async () => {
  (auth0.getSession as jest.Mock).mockResolvedValue(null);
  const req = new NextRequest("http://localhost/api/posts", { method: "POST" });
  const res = await POST(req);
  expect(res.status).toBe(401);
});
```

## Step 6 — proxy.ts test pattern

```ts
// proxy.test.ts
it("redirects unauth user from /feed to /auth/login", async () => {
  (auth0.getSession as jest.Mock).mockResolvedValue(null);
  const res = await proxy(new NextRequest("http://localhost/feed"));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain("/auth/login");
});

it("returns JSON 401 on protected /api/* without session", async () => {
  (auth0.getSession as jest.Mock).mockResolvedValue(null);
  const res = await proxy(new NextRequest("http://localhost/api/posts"));
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ success: false, error: "Unauthorized" });
});

it("lets through /api/health without a session", async () => {
  const res = await proxy(new NextRequest("http://localhost/api/health"));
  // NextResponse.next() — verify it didn't redirect
  expect(res.headers.get("location")).toBeNull();
});
```

## Step 7 — Playwright smoke (stretch)

Only if time permits. Stub the Auth0 callback by injecting a session cookie via a test-only endpoint.

```bash
npx playwright install --with-deps chromium
npx playwright test
```

## Common pitfalls

- **Trying to mock the Firestore SDK with jest** — pain. Use the emulator.
- **Forgetting `FIRESTORE_EMULATOR_HOST`** — tests hit real Firestore and either fail with creds errors or (worse) write to prod.
- **Sharing Firestore state across tests** — wipe collections in `beforeEach` against the emulator.
- **Testing Tailwind class strings** — brittle and worthless. Test behavior, not classnames.
- **`jest-environment-jsdom` for route handlers** — handlers run in `node`. Don't pollute with jsdom globals.
