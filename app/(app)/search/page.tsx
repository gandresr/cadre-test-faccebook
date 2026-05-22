import { SubNav } from "@/app/_components/SubNav";
import { SectionPanel } from "@/app/_components/SectionPanel";
import { UserCard } from "@/app/_components/UserCard";
import { getCurrentUser } from "@/src/lib/auth/get-current-user";
import { searchUsersByName } from "@/src/lib/users/repository";
import type { User } from "@/src/types";
import { SearchBar } from "./_components/SearchBar";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const me = await getCurrentUser();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results: User[] =
    query.length > 0 ? await searchUsersByName(query, 20) : [];

  return (
    <div>
      <SubNav active="search" />
      <header className="mb-4">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-app-text-primary">
          Search
        </h1>
        <p className="mt-0.5 text-sm text-app-text-secondary">
          Find people by name.
        </p>
      </header>

      <div className="mb-4 border border-app-border bg-app-surface p-4">
        <SearchBar initialQuery={query} />
      </div>

      <SectionPanel
        title={
          query.length === 0
            ? "Results"
            : `Results for "${query}" — ${results.length}`
        }
        flush
      >
        {query.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-app-text-secondary">
            Type a name above to search.
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-app-text-secondary">
            <p className="mb-1">No one named &quot;{query}&quot; yet.</p>
            <p className="text-app-text-tertiary">
              <em>Invite them?</em> <span className="text-[11px]">(stub)</span>
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-app-border-subtle">
            {results.map((user) => {
              const isSelf = user.uid === me.uid;
              return (
                <li
                  key={user.uid}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <UserCard user={user} compact />
                  </div>
                  {isSelf ? (
                    <span className="shrink-0 border border-app-border bg-app-surface-raised px-3 py-1.5 text-[12px] text-app-text-tertiary">
                      This is you
                    </span>
                  ) : (
                    <a
                      href={`/profile/${user.uid}`}
                      className="shrink-0 border border-app-border bg-app-surface px-3 py-1.5 text-[12px] font-medium text-app-text-primary no-underline transition-colors hover:border-app-brand hover:bg-app-surface-raised"
                    >
                      View profile
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
}
