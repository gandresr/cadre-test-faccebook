"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SearchBarProps = {
  initialQuery: string;
};

export function SearchBar({ initialQuery }: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <label htmlFor="search-input" className="sr-only">
        Search by name
      </label>
      <input
        id="search-input"
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name…"
        className="flex-1"
      />
      <button
        type="submit"
        className="shrink-0 bg-app-brand px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-app-brand-hover"
      >
        Search
      </button>
    </form>
  );
}
