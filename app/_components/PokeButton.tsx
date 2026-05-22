"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Wired poke button — POST /api/pokes.
 */
export function PokeButton({
  toUid,
  label,
}: {
  toUid: string;
  label?: string;
}) {
  if (!toUid) {
    throw new Error("[PokeButton] toUid prop is required");
  }
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pokes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUid }),
      });
      if (!res.ok) {
        let msg = `Poke failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          // ignore
        }
        alert(msg);
        return;
      }
      alert("Poke sent.");
      router.refresh();
    } catch (e) {
      console.error("[PokeButton] POST /api/pokes network error:", e);
      alert("Network error while sending poke — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="block w-full border border-app-border bg-app-surface px-2 py-1.5 text-center text-[12px] font-medium text-app-text-primary transition-colors hover:border-app-brand hover:bg-app-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "…" : (label ?? "Poke")}
    </button>
  );
}
