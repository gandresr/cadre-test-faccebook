import Link from "next/link";

import { SubNav } from "@/app/_components/SubNav";
import { SectionPanel } from "@/app/_components/SectionPanel";
import { SectionStrip } from "@/app/_components/SectionStrip";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";

/**
 * Group profile — P2 stretch, no backend yet. Every groupId routes to the
 * "not found" panel until the groups collection ships.
 */
export default async function GroupPage() {
  await getCurrentUser();

  return (
    <>
      <SubNav active="groups" />
      <SectionStrip title="Group" />
      <SectionPanel>
        <p className="px-2 py-6 text-center text-fb-text-muted">
          This group isn&apos;t available yet.
        </p>
        <p className="px-2 pb-2 text-center text-[12px] text-fb-text-muted">
          Groups ship in P2.{" "}
          <Link href="/groups" className="text-fb-link hover:underline">
            Back to all groups
          </Link>
        </p>
      </SectionPanel>
    </>
  );
}
