export type SubNavTab =
  | "feed"
  | "profile"
  | "edit"
  | "friends"
  | "pokes"
  | "search"
  | "messages"
  | "groups";

const TAB_TITLES: Record<SubNavTab, string> = {
  feed: "Home",
  profile: "Profile",
  edit: "Edit profile",
  friends: "Friends",
  pokes: "Pokes",
  search: "Search",
  messages: "Messages",
  groups: "Groups",
};

/**
 * Page-context eyebrow. A small uppercase tracking-wide label that gives
 * the page a name without consuming much vertical space. Visual hierarchy
 * still lives in each page's H1.
 */
export function SubNav({ active }: { active?: SubNavTab }) {
  const title = active ? TAB_TITLES[active] : TAB_TITLES.feed;
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-tertiary">
      {title}
    </div>
  );
}
