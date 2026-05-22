"use client";

import { useState } from "react";
import { SectionPanel } from "@/app/_components/SectionPanel";

const MAX_NAME = 100;
const MAX_DESC = 1000;

export function CreateGroupForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (name.trim().length === 0) {
      alert("Group name is required.");
      return;
    }
    console.log({ name, description, photoURL });
    alert("Created (stub)");
  }

  return (
    <SectionPanel title="Create a Group">
      <form className="space-y-3 p-3 text-[12px]" onSubmit={handleSubmit}>
        <div>
          <label className="block font-bold text-fb-text" htmlFor="grp-name">
            Group name <span className="text-fb-text-muted">(required)</span>
          </label>
          <input
            id="grp-name"
            type="text"
            required
            maxLength={MAX_NAME}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-fb-border bg-white px-2 py-1"
          />
          <div className="text-right text-[11px] text-fb-text-muted">
            {name.length}/{MAX_NAME}
          </div>
        </div>

        <div>
          <label className="block font-bold text-fb-text" htmlFor="grp-desc">
            Description
          </label>
          <textarea
            id="grp-desc"
            rows={5}
            maxLength={MAX_DESC}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full border border-fb-border bg-white px-2 py-1"
          />
          <div className="text-right text-[11px] text-fb-text-muted">
            {description.length}/{MAX_DESC}
          </div>
        </div>

        <div>
          <label className="block font-bold text-fb-text" htmlFor="grp-photo">
            Photo URL <span className="text-fb-text-muted">(optional)</span>
          </label>
          <input
            id="grp-photo"
            type="text"
            placeholder="https://..."
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            className="mt-1 w-full border border-fb-border bg-white px-2 py-1"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-fb-navy px-4 py-1 text-white text-[12px]"
          >
            Create Group
          </button>
        </div>
      </form>
    </SectionPanel>
  );
}
