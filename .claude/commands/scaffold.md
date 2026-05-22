---
description: Bootstrap the Next.js + Auth0 + Firestore project skeleton in the current directory. Run once at the start of P0.
---

You are scaffolding the cadre-test MVP. Execute these steps **in order**:

1. **Init Next.js 16** (TypeScript, App Router, Tailwind, no src/ dir for `app/`):
   ```bash
   npx create-next-app@latest . --typescript --app --tailwind --eslint --no-src-dir --import-alias "@/*" --yes
   ```

2. **Install runtime deps**:
   ```bash
   npm install @auth0/nextjs-auth0 firebase-admin firebase zod
   ```

3. **Install dev deps**:
   ```bash
   npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom supertest @types/supertest
   ```

4. **Create directory skeleton**:
   ```bash
   mkdir -p src/lib/auth src/lib/firestore src/lib/posts src/lib/users src/types src/components
   mkdir -p app/auth/login app/auth/callback app/auth/logout
   mkdir -p app/api/posts app/api/users app/api/health
   mkdir -p app/\(app\)/feed app/\(app\)/profile/\[uid\]
   mkdir -p tests/integration
   ```

5. **Write `.env.example`** at the repo root:
   ```
   AUTH0_DOMAIN=
   AUTH0_CLIENT_ID=
   AUTH0_CLIENT_SECRET=
   AUTH0_SECRET=
   APP_BASE_URL=http://localhost:3000
   NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE=google-oauth2
   GOOGLE_APPLICATION_CREDENTIALS=./gcp-firestore-sa.json
   FIRESTORE_PROJECT_ID=
   ```

6. **Add the `proxy.ts` stub** at the repo root (NOT `middleware.ts` — this is Next 16):
   ```ts
   import type { NextRequest } from "next/server";
   import { NextResponse } from "next/server";
   export async function proxy(_request: NextRequest) {
     return NextResponse.next();
   }
   ```
   The `auth0` subagent will fill this in during P1.

7. **Add jest config + scripts to `package.json`**:
   - Scripts: `"test": "jest"`, `"test:integration": "jest --selectProjects integration"`, `"test:watch": "jest --watch"`, `"typecheck": "tsc --noEmit"`.
   - Add `jest.config.js` per the `testing-strategy` skill.

8. **Add `.gitignore` entries** for `.env.local`, `*-sa.json`, `.next`, `node_modules`, `coverage`.

9. **First commit** (this starts the interview clock):
   ```bash
   git add -A
   git commit -m "chore: scaffold next.js + auth0 + firestore MVP"
   ```

10. **Verify**: `npm run dev` boots cleanly on `:3000`. Report any errors before proceeding to P1.

After completion, hand control back to the orchestrator to start P1 (Auth0 wiring) via the `auth0` subagent.
