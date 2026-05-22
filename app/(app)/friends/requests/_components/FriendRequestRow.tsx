"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FriendRequest } from "@/src/lib/types";
import { relativeTime } from "@/src/lib/format";

type FriendRequestRowProps = {
  request: FriendRequest;
  direction: "incoming" | "outgoing";
  counterpartDisplayName: string;
  counterpartPhotoURL: string | null;
  counterpartUid: string;
};

export function FriendRequestRow({
  request,
  direction,
  counterpartDisplayName,
  counterpartPhotoURL,
  counterpartUid,
}: FriendRequestRowProps) {
  if (!request) {
    throw new Error("[FriendRequestRow] required prop `request` is missing");
  }
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const requestId = `${request.fromUid}_${request.toUid}`;

  async function call(
    method: "POST" | "DELETE",
    url: string,
    op: string,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await fetch(url, { method });
      if (!res.ok) {
        let msg = `${op} failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          // status fallback
        }
        alert(msg);
        return false;
      }
      router.refresh();
      return true;
    } catch (e) {
      console.error(`[FriendRequestRow] ${op} network error:`, e);
      alert(`Network error during ${op} — please try again.`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function onAccept() {
    void call(
      "POST",
      `/api/friend-requests/${encodeURIComponent(requestId)}/accept`,
      "accept friend request",
    );
  }

  function onReject() {
    void call(
      "POST",
      `/api/friend-requests/${encodeURIComponent(requestId)}/reject`,
      "reject friend request",
    );
  }

  function onWithdraw() {
    void call(
      "DELETE",
      `/api/friend-requests/${encodeURIComponent(requestId)}`,
      "withdraw friend request",
    );
  }

  const photo =
    counterpartPhotoURL ?? `https://i.pravatar.cc/150?u=${counterpartUid}`;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link
        href={`/profile/${counterpartUid}`}
        aria-label={counterpartDisplayName}
        className="shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={counterpartDisplayName}
          width={44}
          height={44}
          className="block h-11 w-11 border border-app-border bg-app-surface-raised object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${counterpartUid}`}
          className="block text-[13.5px] font-semibold text-app-text-primary hover:text-app-brand hover:no-underline"
        >
          {counterpartDisplayName}
        </Link>
        {request.message ? (
          <p className="mt-0.5 line-clamp-2 text-[12.5px] italic text-app-text-secondary">
            “{request.message}”
          </p>
        ) : null}
        <div className="mt-0.5 text-[11.5px] text-app-text-tertiary">
          {relativeTime(request.createdAt)}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {direction === "incoming" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="bg-app-brand px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "…" : "Accept"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="border border-app-border bg-app-surface px-3 py-1.5 text-[12px] font-medium text-app-text-primary transition-colors hover:border-app-brand hover:bg-app-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reject
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onWithdraw}
            className="border border-app-border bg-app-surface px-3 py-1.5 text-[12px] font-medium text-app-text-primary transition-colors hover:border-app-brand hover:bg-app-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "…" : "Withdraw"}
          </button>
        )}
      </div>
    </li>
  );
}
