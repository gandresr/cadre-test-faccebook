"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type FriendButtonState = "none" | "sent" | "friends" | "incoming";

const LABELS: Record<FriendButtonState, string> = {
  none: "Add as friend",
  sent: "Cancel friend request",
  friends: "Unfriend",
  incoming: "Accept friend request",
};

/**
 * Friend-state action button — wired to /api/friend-requests + /api/friendships.
 *
 * Note: the page renders this with an optimistic initial state (the profile
 * page treats outgoing/incoming as `false` until a richer page-level helper
 * exists). The button reconciles by surfacing API error strings verbatim — a
 * 409 from POST means the relationship already exists.
 *
 * TODO: thread the actual `friendRequestId` through `ProfileSidebar` so the
 * `incoming` state has the canonical request id rather than reconstructing
 * the composite from (toUid, viewerUid).
 */
export function FriendButton({
  toUid,
  viewerUid,
  initialState,
}: {
  toUid: string;
  viewerUid: string;
  initialState: FriendButtonState;
}) {
  if (!toUid) {
    throw new Error("[FriendButton] toUid prop is required");
  }
  if (!viewerUid) {
    throw new Error("[FriendButton] viewerUid prop is required");
  }
  const router = useRouter();
  const [state, setState] = useState<FriendButtonState>(initialState);
  const [busy, setBusy] = useState(false);

  async function surfaceError(res: Response, op: string): Promise<string> {
    let msg = `${op} failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      // ignore
    }
    return msg;
  }

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      if (state === "none") {
        const res = await fetch("/api/friend-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toUid }),
        });
        if (!res.ok) {
          alert(await surfaceError(res, "Send friend request"));
          return;
        }
        setState("sent");
        router.refresh();
        return;
      }

      if (state === "sent") {
        const id = `${viewerUid}_${toUid}`;
        const res = await fetch(
          `/api/friend-requests/${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          alert(await surfaceError(res, "Withdraw friend request"));
          return;
        }
        setState("none");
        router.refresh();
        return;
      }

      if (state === "friends") {
        const ok = window.confirm("Unfriend this person?");
        if (!ok) return;
        const res = await fetch(
          `/api/friendships/${encodeURIComponent(toUid)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          alert(await surfaceError(res, "Unfriend"));
          return;
        }
        setState("none");
        router.refresh();
        return;
      }

      if (state === "incoming") {
        const id = `${toUid}_${viewerUid}`;
        const res = await fetch(
          `/api/friend-requests/${encodeURIComponent(id)}/accept`,
          { method: "POST" },
        );
        if (!res.ok) {
          alert(await surfaceError(res, "Accept friend request"));
          return;
        }
        setState("friends");
        router.refresh();
        return;
      }
    } catch (e) {
      console.error(`[FriendButton] network error during ${state}:`, e);
      alert("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isPrimary = state === "none" || state === "incoming";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={
        "block w-full px-2 py-1.5 text-center text-[12px] font-medium transition-colors " +
        (busy
          ? "cursor-not-allowed border border-app-border bg-app-surface-raised text-app-text-tertiary"
          : isPrimary
            ? "bg-app-brand text-white hover:bg-app-brand-hover"
            : "border border-app-border bg-app-surface text-app-text-primary hover:border-app-brand hover:bg-app-surface-raised")
      }
    >
      {busy ? "…" : LABELS[state]}
    </button>
  );
}
