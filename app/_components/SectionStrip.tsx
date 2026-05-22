import Link from "next/link";

/**
 * Refined section header. Lives at the top of a SectionPanel (or stand-alone).
 * Small uppercase tracking-wide label on the surface-raised bar, optional
 * right-aligned [edit] link. The visual weight is restrained on purpose —
 * the panel content does the talking.
 */
export function SectionStrip({
  title,
  children,
  editHref,
}: {
  title?: string;
  children?: React.ReactNode;
  editHref?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-app-border-subtle bg-app-surface-raised px-4 py-2.5">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-app-text-tertiary">
        {title ?? children}
      </span>
      {editHref ? (
        <Link
          href={editHref}
          className="text-[11px] font-medium text-app-text-tertiary hover:text-app-brand hover:no-underline"
        >
          Edit
        </Link>
      ) : null}
    </div>
  );
}
