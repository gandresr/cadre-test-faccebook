import Link from "next/link";
import { relativeTime } from "@/src/lib/format";
import type { Conversation, User } from "@/src/lib/types";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export function ConversationListItem({
  conv,
  other,
  currentUid,
  active,
}: {
  conv: Conversation;
  other: User;
  currentUid: string;
  active: boolean;
}) {
  const unread = conv.unread[currentUid] ?? 0;
  const bg = active ? "bg-fb-bg-lavender" : "hover:bg-fb-bg-soft";
  const preview = conv.lastMessageText.length
    ? truncate(conv.lastMessageText, 60)
    : "No messages yet";

  return (
    <Link
      href={`/messages/${conv.id}`}
      className={`block border-b border-fb-border px-2 py-2 ${bg}`}
    >
      <div className="flex items-start gap-2">
        {other.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={other.photoURL}
            alt={other.displayName}
            width={36}
            height={36}
            className="border border-fb-border"
          />
        ) : (
          <div className="h-9 w-9 border border-fb-border bg-fb-bg-soft" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold text-fb-link text-[12px]">
              {other.displayName}
            </span>
            <span className="shrink-0 text-fb-text-muted text-[11px]">
              {relativeTime(conv.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-fb-text text-[12px]">{preview}</span>
            {unread > 0 ? (
              <span className="shrink-0 bg-fb-navy px-1.5 text-white text-[11px]">
                {unread}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
