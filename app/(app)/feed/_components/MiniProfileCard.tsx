import Link from "next/link";
import { SectionPanel } from "@/app/_components/SectionPanel";
import type { User } from "@/src/types";

type MiniProfileCardProps = {
  user: User;
};

export function MiniProfileCard({ user }: MiniProfileCardProps) {
  if (!user) {
    throw new Error("[MiniProfileCard] required prop `user` is missing");
  }

  return (
    <SectionPanel title="Me">
      <div className="flex flex-col items-start gap-2 px-3 py-3 text-[12px]">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.displayName}
            width={80}
            height={80}
            className="block border border-fb-border"
            style={{ objectFit: "cover", width: 80, height: 80 }}
          />
        ) : (
          <div className="flex h-[80px] w-[80px] items-center justify-center border border-fb-border bg-fb-bg-soft text-fb-text-muted">
            no photo
          </div>
        )}
        <div className="text-[14px] font-bold text-fb-text">
          {user.displayName}
        </div>
        {user.network && (
          <div className="italic text-fb-text-muted">{user.network}</div>
        )}
        <Link href="/profile/edit" className="text-fb-link hover:underline">
          Edit profile
        </Link>
        <Link
          href={`/profile/${user.uid}`}
          className="text-fb-link hover:underline"
        >
          View my wall
        </Link>
      </div>
    </SectionPanel>
  );
}
