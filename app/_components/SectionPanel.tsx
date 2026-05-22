import { SectionStrip } from "./SectionStrip";

/**
 * Canonical content card. White surface, thin app-border outline, optional
 * SectionStrip header. When `flush` is true the body skips internal
 * padding so the caller controls density (e.g. for divided lists).
 */
export function SectionPanel({
  title,
  editHref,
  flush,
  children,
}: {
  title?: string;
  editHref?: string;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-app-border bg-app-surface">
      {title ? <SectionStrip editHref={editHref}>{title}</SectionStrip> : null}
      <div
        className={
          flush
            ? "text-app-text-primary"
            : "px-4 py-3 text-[13px] text-app-text-primary"
        }
      >
        {children}
      </div>
    </section>
  );
}
