"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Poke } from "@/src/types";
import { relativeTime } from "@/src/lib/format";

type PokeRowProps = {
  poke: Poke;
};

export function PokeRow({ poke }: PokeRowProps) {
  if (!poke) {
    throw new Error("[PokeRow] required prop `poke` is missing");
  }
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onPokeBack() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pokes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUid: poke.fromUid }),
      });
      if (!res.ok) {
        let msg = `Poke back failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          // ignore
        }
        alert(msg);
        return;
      }
      alert(`Poked ${poke.fromDisplayName} back.`);
      router.refresh();
    } catch (e) {
      console.error("[PokeRow] poke-back network error:", e);
      alert("Network error during poke-back — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onAcknowledge() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pokes/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [poke.id] }),
      });
      if (!res.ok) {
        let msg = `Acknowledge failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          // ignore
        }
        alert(msg);
        return;
      }
      router.refresh();
    } catch (e) {
      console.error("[PokeRow] acknowledge network error:", e);
      alert("Network error while acknowledging poke — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const unread = !poke.acknowledged;
  const photo =
    poke.fromPhotoURL ?? `https://i.pravatar.cc/150?u=${poke.fromUid}`;

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${
        unread ? "bg-app-brand-subtle" : ""
      }`}
    >
      <Link
        href={`/profile/${poke.fromUid}`}
        aria-label={poke.fromDisplayName}
        className="shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={poke.fromDisplayName}
          width={44}
          height={44}
          className="block h-11 w-11 border border-app-border bg-app-surface-raised object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${poke.fromUid}`}
          className="block text-[13.5px] font-semibold text-app-text-primary hover:text-app-brand hover:no-underline"
        >
          {poke.fromDisplayName}
        </Link>
        <div className="text-[11.5px] text-app-text-tertiary">
          poked you {relativeTime(poke.createdAt)}
          {unread ? (
            <span className="ml-2 inline-block bg-app-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              new
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={onPokeBack}
          className="bg-app-brand px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "…" : "Poke back"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onAcknowledge}
          className="border border-app-border bg-app-surface px-3 py-1.5 text-[12px] font-medium text-app-text-primary transition-colors hover:border-app-brand hover:bg-app-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </li>
  );
}
