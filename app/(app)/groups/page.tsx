import Link from "next/link";

import { SubNav } from "@/app/_components/SubNav";
import { SectionPanel } from "@/app/_components/SectionPanel";
import { SectionStrip } from "@/app/_components/SectionStrip";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";

/**
 * Groups directory — P2 stretch, no backend yet. Renders an empty directory
 * with the "Create new group" CTA in place so the route stays in the nav.
 */
export default async function GroupsPage() {
  await getCurrentUser();

  return (
    <>
      <SubNav active="groups" />
      <SectionStrip title="Groups" />
      <SectionPanel>
        <div className="flex items-center justify-between border-b border-fb-border px-3 py-2">
          <span className="text-[13px] text-fb-text-muted">No groups yet.</span>
          <Link
            href="/groups/new"
            className="bg-fb-navy px-3 py-1 text-[12px] text-white no-underline hover:underline"
          >
            Create new group
          </Link>
        </div>
        <p className="px-3 py-6 text-center text-[12px] text-fb-text-muted">
          Groups ship in P2.
        </p>
      </SectionPanel>
    </>
  );
}
