"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, User } from "@/src/lib/types";
import { MessageBubble } from "./MessageBubble";

const POLL_INTERVAL_MS = 3000;

type PendingMessage = Message & { pending: true };
type ThreadMessage = Message | PendingMessage;

function isPending(m: ThreadMessage): m is PendingMessage {
  return (m as PendingMessage).pending === true;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(today) - startOfDay(d)) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function groupByDay(messages: ThreadMessage[]): Array<{
  label: string;
  items: ThreadMessage[];
}> {
  const groups: Array<{ label: string; items: ThreadMessage[] }> = [];
  for (const m of messages) {
    const label = dayLabel(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(m);
    } else {
      groups.push({ label, items: [m] });
    }
  }
  return groups;
}

export function MessageThread({
  convId,
  initialMessages,
  currentUser,
  otherUser,
}: {
  convId: string;
  initialMessages: Message[];
  currentUser: User;
  otherUser: User;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingCounterRef = useRef(0);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Poll for new messages. Server is authoritative; merge by id so optimistic
  // entries get replaced once Firestore returns them.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/conversations/${convId}/messages`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages: Message[] };
        if (cancelled) return;
        setMessages((prev) => {
          // Keep any still-pending optimistic messages whose corresponding
          // server message hasn't shown up yet.
          const serverIds = new Set(data.messages.map((m) => m.id));
          const stillPending = prev.filter(
            (m) => isPending(m) && !serverIds.has(m.id),
          );
          return [...data.messages, ...stillPending];
        });
      } catch {
        // Network blips are non-fatal — next tick retries.
      }
    }
    const handle = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [convId]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    pendingCounterRef.current += 1;
    const tempId = `pending_${Date.now()}_${pendingCounterRef.current}`;
    const optimistic: PendingMessage = {
      id: tempId,
      fromUid: currentUser.uid,
      text: trimmed,
      createdAt: new Date().toISOString(),
      readBy: [currentUser.uid],
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const body = (await res.json().catch(() => null)) as {
        message?: Message;
        error?: string;
      } | null;
      if (!res.ok || !body?.message) {
        throw new Error(
          body?.error ?? `send failed: status ${res.status} with no JSON body`,
        );
      }
      const saved = body.message;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(e instanceof Error ? e.message : String(e));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }, [text, sending, convId, currentUser.uid]);

  const groups = groupByDay(messages);
  const disabled = text.trim().length === 0 || sending;

  function sender(uid: string): User {
    if (uid === currentUser.uid) return currentUser;
    if (uid === otherUser.uid) return otherUser;
    throw new Error(
      `[MessageThread] message has unknown fromUid=${uid}; conv participants are ${currentUser.uid}/${otherUser.uid}`,
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="max-h-[480px] flex-1 overflow-y-auto px-3 py-2"
      >
        {groups.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-fb-text-muted">
            No messages yet. Say hi!
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <div className="my-2 text-center text-[11px] text-fb-text-muted">
                {g.label}
              </div>
              {g.items.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isMine={m.fromUid === currentUser.uid}
                  sender={sender(m.fromUid)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-fb-border bg-fb-bg-soft p-2">
        {error ? (
          <div className="mb-1 text-[11px] text-app-danger">{error}</div>
        ) : null}
        <div className="flex items-start">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder="Type a message…"
            className="w-full border border-fb-border bg-white px-2 py-1 text-[12px]"
            disabled={sending}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled}
            className="ml-2 bg-fb-navy px-3 py-1 text-[12px] text-white disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </>
  );
}
