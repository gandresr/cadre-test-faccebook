# syntax=docker/dockerfile:1.7
#
# Cloud Run image for the Next.js 16 social-network MVP.
#
# Three stages:
#   1. deps   — install npm packages once, cached by package-lock.json
#   2. build  — produce Next.js standalone output (.next/standalone, .next/static)
#   3. runner — minimal runtime image; runs `node server.js` on $PORT
#
# Built for linux/amd64 only (Cloud Run rejects arm64); the buildx invocation
# in scripts/deploy.sh pins --platform=linux/amd64.

# ─── 1. Dependencies ──────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ─── 2. Build ────────────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `next build` walks every route to collect page data. That walk imports our
# Firestore admin singleton and Auth0 client, both of which eagerly throw on
# missing env vars. Inject dummy values during the build so the walk completes.
# Real values are wired at runtime by Cloud Run via `--set-env-vars`; nothing
# below is ever shipped in the final image because these are scoped to the
# `build` stage and never copied into the `runner` stage.
ENV AUTH0_DOMAIN=build.invalid \
    AUTH0_CLIENT_ID=build-time-placeholder \
    AUTH0_CLIENT_SECRET=build-time-placeholder \
    AUTH0_SECRET=00000000000000000000000000000000000000000000000000000000000000aa \
    APP_BASE_URL=http://build.invalid \
    NEXT_PUBLIC_AUTH0_CONNECTION_GOOGLE=google-oauth2 \
    FIRESTORE_PROJECT_ID=build-time-placeholder

# `next build` honours `output: "standalone"` from next.config.ts.
RUN npm run build

# ─── 3. Runner ───────────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run injects PORT (default 8080). Next's standalone server reads it.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone bundle (server.js + minimal node_modules), static assets,
# and public/. The standalone output already excludes anything outside the
# server's transitive closure.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
