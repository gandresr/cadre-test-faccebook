import { relativeTime } from "@/src/lib/format";
import type { Message, User } from "@/src/types";

export function MessageBubble({
  message,
  isMine,
  sender,
}: {
  message: Message;
  isMine: boolean;
  sender: User;
}) {
  const align = isMine ? "justify-end" : "justify-start";
  const bubbleColor = isMine
    ? "bg-fb-navy text-white"
    : "bg-fb-bg-lavender text-fb-text";

  const photo = sender.photoURL ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sender.photoURL}
      alt={sender.displayName}
      width={24}
      height={24}
      className="border border-fb-border"
    />
  ) : (
    <div className="h-6 w-6 border border-fb-border bg-fb-bg-soft" />
  );

  return (
    <div className={`my-2 flex ${align}`}>
      <div
        className={`flex max-w-[60%] items-end gap-2 ${
          isMine ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {photo}
        <div>
          <div
            className={`${bubbleColor} px-3 py-1.5 text-[12px] leading-snug whitespace-pre-wrap break-words`}
          >
            {message.text}
          </div>
          <div
            className={`mt-0.5 text-[10px] text-fb-text-muted ${
              isMine ? "text-right" : "text-left"
            }`}
          >
            {relativeTime(message.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
