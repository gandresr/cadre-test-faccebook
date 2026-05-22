import Link from "next/link";
import type { WallPost } from "@/src/types";
import { relativeTime } from "@/src/lib/format";

/**
 * Single wall-post row. When `showWallOwner` is true, the byline becomes
 * "Author → Owner" — used on the friend-activity feed. The owner's display
 * name must be provided by the caller (feed page resolves it via a batch
 * lookup).
 */
export function WallPostCard({
  post,
  showWallOwner = false,
  wallOwnerDisplayName,
}: {
  post: WallPost;
  showWallOwner?: boolean;
  wallOwnerDisplayName?: string;
}) {
  if (!post) {
    throw new Error("[WallPostCard] post prop is required");
  }
  const photo =
    post.authorPhotoURL ?? `https://i.pravatar.cc/150?u=${post.authorUid}`;

  return (
    <article className="flex items-start gap-3">
      <Link
        href={`/profile/${post.authorUid}`}
        aria-label={`${post.authorDisplayName}'s profile`}
        className="shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={post.authorDisplayName}
          width={40}
          height={40}
          className="block h-10 w-10 border border-app-border bg-app-surface-raised object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-[12px] leading-snug">
          <Link
            href={`/profile/${post.authorUid}`}
            className="font-semibold text-app-text-primary hover:text-app-brand hover:no-underline"
          >
            {post.authorDisplayName}
          </Link>
          {showWallOwner && wallOwnerDisplayName ? (
            <>
              <span className="text-app-text-tertiary">→</span>
              <Link
                href={`/profile/${post.wallOwnerUid}`}
                className="text-app-text-secondary hover:text-app-brand hover:no-underline"
              >
                {wallOwnerDisplayName}
                {"’"}s wall
              </Link>
            </>
          ) : null}
          <span className="text-app-text-tertiary">·</span>
          <time
            dateTime={post.createdAt}
            className="text-app-text-tertiary"
            title={post.createdAt}
          >
            {relativeTime(post.createdAt)}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-app-text-primary">
          {post.text}
        </p>
      </div>
    </article>
  );
}
