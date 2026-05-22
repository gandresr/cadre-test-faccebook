/**
 * Pure formatting helpers used by both server and client components.
 *
 * Timestamps cross the RSC → client boundary as ISO-8601 strings (see
 * `src/lib/firestore/converters.ts` — every `Timestamp` gets `.toISOString()`).
 * These helpers accept ISO strings, Dates, or millisecond numbers so callers
 * never have to type-narrow at the call site.
 */

export type TimeInput = string | Date | number | null | undefined;

function toMillis(t: TimeInput): number {
  if (t == null) return 0;
  if (typeof t === "number") return t;
  if (typeof t === "string") {
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (t instanceof Date) return t.getTime();
  return 0;
}

/**
 * Coarse human-friendly relative time. Caps at "yesterday" / "<N> days ago"
 * for the first week, then falls back to an absolute "Month D, YYYY" date.
 */
export function relativeTime(t: TimeInput, now: number = Date.now()): string {
  const ms = toMillis(t);
  if (ms === 0) return "";
  const deltaSec = Math.max(0, (now - ms) / 1000);
  if (deltaSec < 60) return "just now";
  const minutes = Math.floor(deltaSec / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(t);
}

/** Absolute "Month D, YYYY" — e.g. "January 12, 2005". */
export function formatDate(t: TimeInput): string {
  const ms = toMillis(t);
  if (ms === 0) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "h:MMam Month D, YYYY" — matches 2004-era forum-post timestamps. */
export function formatDateTime(t: TimeInput): string {
  const ms = toMillis(t);
  if (ms === 0) return "";
  const d = new Date(ms);
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(/\s/g, "");
  return `${time} ${formatDate(t)}`;
}
