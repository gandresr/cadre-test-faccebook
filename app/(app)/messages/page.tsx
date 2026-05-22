import { SubNav } from "@/app/_components/SubNav";
import { SectionStrip } from "@/app/_components/SectionStrip";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { listConversationsFor } from "@/src/lib/conversations/repository";
import { getUsersByIds } from "@/src/lib/users/repository";
import { ConversationListItem } from "./_components/ConversationListItem";

export const dynamic = "force-dynamic";

export default async function MessagesInboxPage() {
  const me = await getCurrentUser();
  const conversations = await listConversationsFor(me.uid);

  const otherUids = conversations
    .map((c) => c.participants.find((p) => p !== me.uid))
    .filter((u): u is string => typeof u === "string");
  const others = await getUsersByIds(otherUids);
  const othersByUid = new Map(others.map((u) => [u.uid, u]));

  return (
    <div>
      <SubNav active="messages" />
      <SectionStrip title="Inbox" />
      <div
        className="mt-3 grid gap-4"
        style={{ gridTemplateColumns: "300px 1fr" }}
      >
        <aside className="border border-fb-border bg-fb-bg-page">
          {conversations.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-fb-text-muted">
              No conversations yet.
            </div>
          ) : (
            <ul>
              {conversations.map((c) => {
                const otherUid = c.participants.find((p) => p !== me.uid);
                if (!otherUid) {
                  throw new Error(
                    `[messages] conversation ${c.id} has no other participant relative to ${me.uid}`,
                  );
                }
                const other = othersByUid.get(otherUid);
                if (!other) {
                  throw new Error(
                    `[messages] conversation ${c.id} references unknown user ${otherUid}`,
                  );
                }
                return (
                  <li key={c.id}>
                    <ConversationListItem
                      conv={c}
                      other={other}
                      currentUid={me.uid}
                      active={false}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
        <main className="border border-fb-border bg-fb-bg-soft p-6 text-[12px] text-fb-text-muted">
          Select a conversation from the left.
        </main>
      </div>
    </div>
  );
}
