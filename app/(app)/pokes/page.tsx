import Link from "next/link";
import { SubNav } from "@/app/_components/SubNav";
import { SectionPanel } from "@/app/_components/SectionPanel";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { acknowledgePokes, listPokesFor } from "@/src/lib/pokes/repository";
import { PokeRow } from "./_components/PokeRow";

export default async function PokesPage() {
  const me = await getCurrentUser();
  const pokes = await listPokesFor(me.uid);

  // Acknowledge on view — runs after the list is captured so the unread
  // highlight still renders for the formerly-unread rows.
  const unackedIds = pokes.filter((p) => !p.acknowledged).map((p) => p.id);
  if (unackedIds.length > 0) {
    await acknowledgePokes(me.uid, unackedIds);
  }

  const unreadCount = unackedIds.length;

  return (
    <div>
      <SubNav active="pokes" />
      <header className="mb-4">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-app-text-primary">
          Pokes
        </h1>
        <p className="mt-0.5 text-sm text-app-text-secondary">
          {pokes.length === 0
            ? "Nobody has poked you yet."
            : unreadCount > 0
              ? `${unreadCount} new ${unreadCount === 1 ? "poke" : "pokes"} since you last visited.`
              : "You're all caught up."}
        </p>
      </header>

      <SectionPanel title="You have been poked by…" flush>
        {pokes.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-app-text-secondary">
            <p className="mb-3">Nobody has poked you.</p>
            <p>
              <Link href="/search" className="text-app-brand underline">
                Go find someone to poke.
              </Link>
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-app-border-subtle">
            {pokes.map((p) => (
              <PokeRow key={p.id} poke={p} />
            ))}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
}
