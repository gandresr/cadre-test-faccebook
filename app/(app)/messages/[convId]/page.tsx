import Link from "next/link";
import { SubNav } from "@/app/_components/SubNav";
import { SectionStrip } from "@/app/_components/SectionStrip";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import {
  getConversation,
  listConversationsFor,
  listMessages,
  markRead,
} from "@/src/lib/conversations/repository";
import { getUser, getUsersByIds } from "@/src/lib/users/repository";
import { ConversationListItem } from "../_components/ConversationListItem";
import { MessageThread } from "./_components/MessageThread";

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ convId: string }>;
}) {
  const me = await getCurrentUser();
  const { convId } = await params;

  let conv;
  try {
    conv = await getConversation({ convId, requesterUid: me.uid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const notFound = /not found/i.test(msg);
    const forbidden = /not a participant/i.test(msg);
    if (!notFound && !forbidden) throw e;
    return (
      <div>
        <SubNav active="messages" />
        <SectionStrip title="Messages" />
        <p className="mt-4 px-3 text-[13px] text-fb-text">
          {forbidden
            ? "You don't have access to this conversation."
            : "Conversation not found."}
        </p>
      </div>
    );
  }

  const otherUid = conv.participants.find((p) => p !== me.uid);
  if (!otherUid) {
    throw new Error(
      `[messages/${convId}] conversation has no other participant relative to ${me.uid}`,
    );
  }
  const other = await getUser(otherUid);
  if (!other) {
    throw new Error(`[messages/${convId}] unknown participant uid=${otherUid}`);
  }

  const [messages, allConversations] = await Promise.all([
    listMessages({ convId, requesterUid: me.uid }),
    listConversationsFor(me.uid),
  ]);

  // Fire-and-forget: clear unread badge for this thread. Don't await — if it
  // throws, surface in logs but don't block render.
  markRead({ convId, requesterUid: me.uid }).catch((e) => {
    console.error(`[messages/${convId}] markRead failed:`, e);
  });

  const sidebarOtherUids = allConversations
    .map((c) => c.participants.find((p) => p !== me.uid))
    .filter((u): u is string => typeof u === "string");
  const sidebarOthers = await getUsersByIds(sidebarOtherUids);
  const sidebarOthersByUid = new Map(sidebarOthers.map((u) => [u.uid, u]));

  return (
    <div>
      <SubNav active="messages" />
      <SectionStrip title="Inbox" />
      <div
        className="mt-3 grid gap-4"
        style={{ gridTemplateColumns: "300px 1fr" }}
      >
        <aside className="border border-fb-border bg-fb-bg-page">
          {allConversations.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-fb-text-muted">
              No conversations yet.
            </div>
          ) : (
            <ul>
              {allConversations.map((c) => {
                const sidebarOtherUid = c.participants.find(
                  (p) => p !== me.uid,
                );
                if (!sidebarOtherUid) {
                  throw new Error(
                    `[messages/${convId}] sidebar conversation ${c.id} has no other participant`,
                  );
                }
                const sidebarOther = sidebarOthersByUid.get(sidebarOtherUid);
                if (!sidebarOther) {
                  throw new Error(
                    `[messages/${convId}] sidebar conversation ${c.id} references unknown user ${sidebarOtherUid}`,
                  );
                }
                return (
                  <li key={c.id}>
                    <ConversationListItem
                      conv={c}
                      other={sidebarOther}
                      currentUid={me.uid}
                      active={c.id === convId}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
        <main className="flex flex-col border border-fb-border bg-fb-bg-page">
          <div className="flex items-center justify-between gap-2 bg-fb-navy px-3 py-2 text-white">
            <div className="flex items-center gap-2">
              {other.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={other.photoURL}
                  alt={other.displayName}
                  width={28}
                  height={28}
                  className="border border-fb-navy-dark"
                />
              ) : (
                <div className="h-7 w-7 border border-fb-navy-dark bg-fb-bg-soft" />
              )}
              <span className="font-bold text-[13px]">{other.displayName}</span>
            </div>
            <Link
              href={`/profile/${otherUid}`}
              className="text-fb-blue-light text-[12px] hover:underline"
            >
              View profile
            </Link>
          </div>

          <MessageThread
            convId={convId}
            initialMessages={messages}
            currentUser={me}
            otherUser={other}
          />
        </main>
      </div>
    </div>
  );
}
