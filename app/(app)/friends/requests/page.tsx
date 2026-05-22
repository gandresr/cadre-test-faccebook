import Link from "next/link";
import { SubNav } from "@/app/_components/SubNav";
import { SectionPanel } from "@/app/_components/SectionPanel";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { getUser } from "@/src/lib/users/repository";
import {
  listIncomingRequests,
  listOutgoingRequests,
} from "@/src/lib/friend-requests/repository";
import { FriendRequestRow } from "./_components/FriendRequestRow";

type FriendRequestsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function FriendRequestsPage({
  searchParams,
}: FriendRequestsPageProps) {
  const me = await getCurrentUser();
  const { tab } = await searchParams;
  const activeTab: "incoming" | "sent" = tab === "sent" ? "sent" : "incoming";

  const incoming = await listIncomingRequests(me.uid);
  const sent = await listOutgoingRequests(me.uid);

  const incomingCount = incoming.length;
  const sentCount = sent.length;

  const tabBase =
    "border-b-2 px-3 py-2 text-[13px] transition-colors hover:no-underline";
  const tabActive = "border-app-brand font-semibold text-app-text-primary";
  const tabInactive =
    "border-transparent text-app-text-secondary hover:border-app-brand-muted hover:text-app-text-primary";

  return (
    <div>
      <SubNav active="friends" />
      <header className="mb-4">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-app-text-primary">
          Friend requests
        </h1>
        <p className="mt-0.5 text-sm text-app-text-secondary">
          Approve, withdraw, or follow up on pending connections.
        </p>
      </header>

      <div className="mb-4 flex gap-1 border-b border-app-border">
        <Link
          href="/friends/requests"
          className={`${tabBase} ${activeTab === "incoming" ? tabActive : tabInactive}`}
        >
          Incoming{" "}
          <span className="ml-1 text-app-text-tertiary">({incomingCount})</span>
        </Link>
        <Link
          href="/friends/requests?tab=sent"
          className={`${tabBase} ${activeTab === "sent" ? tabActive : tabInactive}`}
        >
          Sent{" "}
          <span className="ml-1 text-app-text-tertiary">({sentCount})</span>
        </Link>
      </div>

      <SectionPanel
        title={activeTab === "incoming" ? "Incoming requests" : "Sent requests"}
        flush
      >
        {activeTab === "incoming" ? (
          incoming.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-app-text-secondary">
              No incoming friend requests.
            </div>
          ) : (
            <ul className="divide-y divide-app-border-subtle">
              {await Promise.all(
                incoming.map(async (r) => {
                  const from = await getUser(r.fromUid);
                  if (!from) {
                    throw new Error(
                      `[friends/requests] sender ${r.fromUid} missing from users collection`,
                    );
                  }
                  return (
                    <FriendRequestRow
                      key={`${r.fromUid}_${r.toUid}`}
                      request={r}
                      direction="incoming"
                      counterpartUid={from.uid}
                      counterpartDisplayName={from.displayName}
                      counterpartPhotoURL={from.photoURL}
                    />
                  );
                }),
              )}
            </ul>
          )
        ) : sent.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-app-text-secondary">
            You haven&apos;t sent any friend requests.
          </div>
        ) : (
          <ul className="divide-y divide-app-border-subtle">
            {await Promise.all(
              sent.map(async (r) => {
                const to = await getUser(r.toUid);
                if (!to) {
                  throw new Error(
                    `[friends/requests] recipient ${r.toUid} missing from users collection`,
                  );
                }
                return (
                  <FriendRequestRow
                    key={`${r.fromUid}_${r.toUid}`}
                    request={r}
                    direction="outgoing"
                    counterpartUid={to.uid}
                    counterpartDisplayName={to.displayName}
                    counterpartPhotoURL={to.photoURL}
                  />
                );
              }),
            )}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
}
