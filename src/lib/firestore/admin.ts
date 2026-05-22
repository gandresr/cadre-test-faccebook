/**
 * Per-domain re-export shim. Lets scripts and modules that import from
 * `@/src/lib/firestore/admin` resolve to the canonical singleton in
 * `src/lib/firestore.ts`.
 */

export { db } from "@/src/lib/firestore";
