import { SectionPanel } from "@/app/_components/SectionPanel";
import { WallPostCard } from "@/app/_components/WallPostCard";
import type { User, WallPost } from "@/src/lib/types";
import { WallPostComposer } from "./WallPostComposer";

type WallSectionProps = {
  wallOwner: User;
  viewingAs: User;
  canPost: boolean;
  wallPosts: WallPost[];
};

export function WallSection({
  wallOwner,
  viewingAs: _viewingAs,
  canPost,
  wallPosts,
}: WallSectionProps) {
  return (
    <SectionPanel title="The Wall">
      {canPost && <WallPostComposer wallOwnerUid={wallOwner.uid} />}
      <div>
        {wallPosts.length === 0 ? (
          <p className="p-3 italic text-fb-text-muted">No wall posts yet.</p>
        ) : (
          wallPosts.map((post) => <WallPostCard key={post.id} post={post} />)
        )}
      </div>
    </SectionPanel>
  );
}
