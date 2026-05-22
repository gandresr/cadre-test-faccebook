import { SubNav } from "@/app/_components/SubNav";
import { SectionStrip } from "@/app/_components/SectionStrip";
import { CreateGroupForm } from "./_components/CreateGroupForm";

export default function CreateGroupPage() {
  return (
    <div>
      <SubNav active="groups" />
      <SectionStrip>Create a Group</SectionStrip>
      <div className="mt-3">
        <CreateGroupForm />
      </div>
    </div>
  );
}
