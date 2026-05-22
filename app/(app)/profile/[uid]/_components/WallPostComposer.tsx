"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type WallPostComposerProps = {
  wallOwnerUid: string;
};

const MAX_LENGTH = 500;

export function WallPostComposer({ wallOwnerUid }: WallPostComposerProps) {
  if (!wallOwnerUid) {
    throw new Error("[WallPostComposer] wallOwnerUid prop is required");
  }
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const disabled = busy || text.length === 0 || text.length > MAX_LENGTH;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    setBusy(true);
    try {
      const res = await fetch("/api/wall-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallOwnerUid, text }),
      });
      if (!res.ok) {
        let msg = `Wall post failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          // ignore
        }
        alert(msg);
        return;
      }
      setText("");
      router.refresh();
    } catch (e) {
      console.error(
        "[WallPostComposer] POST /api/wall-posts network error:",
        e,
      );
      alert("Network error while posting — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-fb-border bg-fb-bg-soft p-3"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write something..."
        rows={3}
        disabled={busy}
        className="w-full border border-fb-border bg-white px-2 py-1 text-[13px] text-fb-text disabled:opacity-60"
      />
      <div className="mt-1 flex items-center justify-between">
        <button
          type="submit"
          disabled={disabled}
          className="bg-fb-navy px-3 py-1 text-[13px] text-white disabled:opacity-50"
        >
          Post
        </button>
        <span
          className={`text-[11px] ${
            text.length > MAX_LENGTH ? "text-red-600" : "text-fb-text-muted"
          }`}
        >
          {text.length} / {MAX_LENGTH}
        </span>
      </div>
    </form>
  );
}
