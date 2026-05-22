import { SubNav } from "@/app/_components/SubNav";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { EditProfileForm } from "./_components/EditProfileForm";

export default async function EditProfilePage() {
  const me = await getCurrentUser();

  return (
    <div className="mx-auto max-w-[960px] p-3 text-[13px] text-fb-text">
      <SubNav active="edit" />

      <div className="mt-3 border border-fb-border bg-fb-navy px-3 py-2 text-white">
        <h1 className="text-[14px] font-bold">Edit Profile</h1>
      </div>

      <div className="mt-3">
        <EditProfileForm user={me} />
      </div>
    </div>
  );
}
