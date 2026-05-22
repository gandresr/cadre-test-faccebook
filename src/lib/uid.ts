/**
 * Auth0 `sub` → Firestore-safe uid. Auth0 subs look like
 * `google-oauth2|112930582376605808650`; Firestore doc IDs may not contain
 * `/`, and we replace `|` with `_` to keep IDs URL-safe and visually
 * consistent across the codebase.
 */
export function sanitizeUid(sub: string): string {
  if (typeof sub !== "string" || sub.length === 0) {
    throw new Error(
      `[sanitizeUid] expected a non-empty string Auth0 sub; got ${JSON.stringify(sub)}`,
    );
  }
  return sub.replace(/\|/g, "_");
}
