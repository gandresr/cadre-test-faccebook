/**
 * Thin re-export shim so pages can import from `@/src/lib/users/repository`
 * (the per-domain path used across the app) while the actual implementation
 * still lives in the flat `src/lib/users.ts` module.
 *
 * Naming notes:
 *   - The flat module exposes `tryGetUser(uid): Promise<User | null>` (returns
 *     `null` on miss) and `getUser(uid): Promise<User>` (throws). Every
 *     consumer of `users/repository.getUser` does `if (!me)` / `?.displayName`
 *     — i.e. expects the nullable variant. We re-export `tryGetUser` AS
 *     `getUser` so the call sites work as written.
 *   - `tokenizeDisplayName` is the per-domain name; the flat module exports
 *     `nameTokensFor`. Both compute the same lowercase prefix tokens.
 */

export {
  tryGetUser as getUser,
  nameTokensFor as tokenizeDisplayName,
  getUsersByIds,
  searchUsersByName,
  upsertUserFromSession,
  registerUser,
  registerUserSchema,
  updateUser,
} from "@/src/lib/users";

export type {
  UpsertUserInput,
  RegisterUserInput,
  RegisterUserPayload,
  UpdateUserPatch,
} from "@/src/lib/users";
