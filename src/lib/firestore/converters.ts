/**
 * Per-domain re-export shim. The converters themselves live in
 * `src/lib/firestore.ts`.
 */

export {
  userConverter,
  wallPostConverter,
  friendshipConverter,
  friendRequestConverter,
  pokeConverter,
  conversationConverter,
  messageConverter,
} from "@/src/lib/firestore";
