"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionPanel } from "@/app/_components/SectionPanel";
import type { User } from "@/src/lib/types";

type EditProfileFormProps = {
  user: User;
};

type FormState = {
  status: string;
  network: string;
  displayName: string;
  sex: "male" | "female" | "other" | "";
  birthday: string;
  hometown: string;
  currentResidence: string;
  phone: string;
  aim: string;
  website: string;
  classYear: string;
  concentration: string;
  highSchool: string;
  courses: string;
  relationshipStatus:
    | "single"
    | "in_relationship"
    | "engaged"
    | "married"
    | "its_complicated"
    | "";
  interestedIn: "men" | "women" | "both" | "";
  lookingFor: {
    friendship: boolean;
    dating: boolean;
    random_play: boolean;
    whatever_i_can_get: boolean;
  };
  politicalViews: string;
  religiousViews: string;
  books: string;
  movies: string;
  music: string;
  tv: string;
  quotes: string;
  aboutMe: string;
};

function initialState(user: User): FormState {
  return {
    status: user.status ?? "",
    network: user.network ?? "",
    displayName: user.displayName ?? "",
    sex: user.basic.sex ?? "",
    birthday: user.basic.birthday ?? "",
    hometown: user.basic.hometown ?? "",
    currentResidence: user.basic.currentResidence ?? "",
    phone: user.basic.phone ?? "",
    aim: user.basic.aim ?? "",
    website: user.basic.website ?? "",
    classYear:
      user.academic.classYear != null ? String(user.academic.classYear) : "",
    concentration: user.academic.concentration ?? "",
    highSchool: user.academic.highSchool ?? "",
    courses: user.academic.courses.join(", "),
    relationshipStatus: user.social.relationshipStatus ?? "",
    interestedIn: user.social.interestedIn ?? "",
    lookingFor: {
      friendship: user.social.lookingFor.includes("friendship"),
      dating: user.social.lookingFor.includes("dating"),
      random_play: user.social.lookingFor.includes("random_play"),
      whatever_i_can_get: user.social.lookingFor.includes("whatever_i_can_get"),
    },
    politicalViews: user.social.politicalViews ?? "",
    religiousViews: user.social.religiousViews ?? "",
    books: user.favorites.books ?? "",
    movies: user.favorites.movies ?? "",
    music: user.favorites.music ?? "",
    tv: user.favorites.tv ?? "",
    quotes: user.favorites.quotes ?? "",
    aboutMe: user.aboutMe ?? "",
  };
}

const inputCls =
  "border border-fb-border bg-white px-2 py-1 text-[13px] text-fb-text";
const labelCls = "block text-[12px] font-bold text-fb-text mb-1";
const rowCls = "px-3 py-2";

export function EditProfileForm({ user }: EditProfileFormProps) {
  const router = useRouter();
  const search = useSearchParams();
  const welcome = search?.get("welcome") === "1";
  const [form, setForm] = useState<FormState>(() => initialState(user));
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);

    const lookingFor: Array<
      "friendship" | "dating" | "random_play" | "whatever_i_can_get"
    > = [];
    if (form.lookingFor.friendship) lookingFor.push("friendship");
    if (form.lookingFor.dating) lookingFor.push("dating");
    if (form.lookingFor.random_play) lookingFor.push("random_play");
    if (form.lookingFor.whatever_i_can_get)
      lookingFor.push("whatever_i_can_get");

    const payload = {
      displayName: form.displayName.trim() || user.displayName,
      status: form.status.trim() || null,
      network: form.network.trim() || null,
      basic: {
        sex: form.sex === "" ? null : form.sex,
        birthday: form.birthday.trim() || null,
        hometown: form.hometown.trim() || null,
        currentResidence: form.currentResidence.trim() || null,
        phone: form.phone.trim() || null,
        aim: form.aim.trim() || null,
        website: form.website.trim() || null,
      },
      academic: {
        classYear: form.classYear.trim() === "" ? null : Number(form.classYear),
        concentration: form.concentration.trim() || null,
        highSchool: form.highSchool.trim() || null,
        courses: form.courses
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      },
      social: {
        relationshipStatus:
          form.relationshipStatus === "" ? null : form.relationshipStatus,
        interestedIn: form.interestedIn === "" ? null : form.interestedIn,
        lookingFor,
        politicalViews: form.politicalViews.trim() || null,
        religiousViews: form.religiousViews.trim() || null,
      },
      favorites: {
        books: form.books.trim() || null,
        movies: form.movies.trim() || null,
        music: form.music.trim() || null,
        tv: form.tv.trim() || null,
        quotes: form.quotes.trim() || null,
      },
      aboutMe: form.aboutMe.trim() || null,
    };

    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `Save failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          // ignore json parse failure, fall back to status message
        }
        alert(msg);
        return;
      }
      router.refresh();
      router.push(`/profile/${user.uid}`);
    } catch (e) {
      console.error("[EditProfileForm] PUT /api/users/me network error:", e);
      alert("Network error while saving profile — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {welcome && (
        <div className="border border-fb-border bg-fb-bg-lavender px-3 py-2 text-[13px] text-fb-text">
          Welcome! Fill in as much as you want — you can come back any time.
        </div>
      )}

      <SectionPanel title="Status">
        <div className={rowCls}>
          <label className={labelCls} htmlFor="status">
            Status
          </label>
          <input
            id="status"
            type="text"
            maxLength={140}
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={`${inputCls} w-full`}
          />
        </div>
      </SectionPanel>

      <SectionPanel title="Network">
        <div className={rowCls}>
          <label className={labelCls} htmlFor="network">
            Network
          </label>
          <input
            id="network"
            type="text"
            placeholder="e.g. harvard, stanford, your hometown — optional"
            value={form.network}
            onChange={(e) => set("network", e.target.value)}
            className={`${inputCls} w-full`}
          />
        </div>
      </SectionPanel>

      <SectionPanel title="Basic Info">
        <div className={`${rowCls} grid grid-cols-2 gap-3`}>
          <div>
            <label className={labelCls} htmlFor="sex">
              Sex
            </label>
            <select
              id="sex"
              value={form.sex}
              onChange={(e) => set("sex", e.target.value as FormState["sex"])}
              className={`${inputCls} w-full`}
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="birthday">
              Birthday
            </label>
            <input
              id="birthday"
              type="date"
              value={form.birthday}
              onChange={(e) => set("birthday", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="hometown">
              Hometown
            </label>
            <input
              id="hometown"
              type="text"
              value={form.hometown}
              onChange={(e) => set("hometown", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="currentResidence">
              Current Residence
            </label>
            <input
              id="currentResidence"
              type="text"
              value={form.currentResidence}
              onChange={(e) => set("currentResidence", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              type="text"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="aim">
              AIM
            </label>
            <input
              id="aim"
              type="text"
              value={form.aim}
              onChange={(e) => set("aim", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls} htmlFor="website">
              Website
            </label>
            <input
              id="website"
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Academic Info">
        <div className={`${rowCls} grid grid-cols-2 gap-3`}>
          <div>
            <label className={labelCls} htmlFor="classYear">
              Class Year
            </label>
            <input
              id="classYear"
              type="number"
              value={form.classYear}
              onChange={(e) => set("classYear", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="concentration">
              Concentration
            </label>
            <input
              id="concentration"
              type="text"
              value={form.concentration}
              onChange={(e) => set("concentration", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="highSchool">
              High School
            </label>
            <input
              id="highSchool"
              type="text"
              value={form.highSchool}
              onChange={(e) => set("highSchool", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="courses">
              Courses (comma-separated)
            </label>
            <input
              id="courses"
              type="text"
              value={form.courses}
              onChange={(e) => set("courses", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Social Info">
        <div className={`${rowCls} grid grid-cols-2 gap-3`}>
          <div>
            <label className={labelCls} htmlFor="relationshipStatus">
              Relationship Status
            </label>
            <select
              id="relationshipStatus"
              value={form.relationshipStatus}
              onChange={(e) =>
                set(
                  "relationshipStatus",
                  e.target.value as FormState["relationshipStatus"],
                )
              }
              className={`${inputCls} w-full`}
            >
              <option value="">—</option>
              <option value="single">Single</option>
              <option value="in_relationship">In a relationship</option>
              <option value="engaged">Engaged</option>
              <option value="married">Married</option>
              <option value="its_complicated">It&apos;s complicated</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="interestedIn">
              Interested In
            </label>
            <select
              id="interestedIn"
              value={form.interestedIn}
              onChange={(e) =>
                set("interestedIn", e.target.value as FormState["interestedIn"])
              }
              className={`${inputCls} w-full`}
            >
              <option value="">—</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="col-span-2">
            <span className={labelCls}>Looking For</span>
            <div className="flex flex-col gap-1 text-[13px]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lookingFor.friendship}
                  onChange={(e) =>
                    set("lookingFor", {
                      ...form.lookingFor,
                      friendship: e.target.checked,
                    })
                  }
                />
                Friendship
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lookingFor.dating}
                  onChange={(e) =>
                    set("lookingFor", {
                      ...form.lookingFor,
                      dating: e.target.checked,
                    })
                  }
                />
                Dating
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lookingFor.random_play}
                  onChange={(e) =>
                    set("lookingFor", {
                      ...form.lookingFor,
                      random_play: e.target.checked,
                    })
                  }
                />
                Random play
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.lookingFor.whatever_i_can_get}
                  onChange={(e) =>
                    set("lookingFor", {
                      ...form.lookingFor,
                      whatever_i_can_get: e.target.checked,
                    })
                  }
                />
                Whatever I can get
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="politicalViews">
              Political Views
            </label>
            <input
              id="politicalViews"
              type="text"
              value={form.politicalViews}
              onChange={(e) => set("politicalViews", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="religiousViews">
              Religious Views
            </label>
            <input
              id="religiousViews"
              type="text"
              value={form.religiousViews}
              onChange={(e) => set("religiousViews", e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Favorites">
        <div className={`${rowCls} flex flex-col gap-3`}>
          {(
            [
              ["books", "Books"],
              ["movies", "Movies"],
              ["music", "Music"],
              ["tv", "TV"],
              ["quotes", "Quotes"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className={labelCls} htmlFor={key}>
                {label}
              </label>
              <textarea
                id={key}
                rows={2}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className={`${inputCls} w-full`}
              />
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="About Me">
        <div className={rowCls}>
          <label className={labelCls} htmlFor="aboutMe">
            About Me
          </label>
          <textarea
            id="aboutMe"
            rows={6}
            maxLength={5000}
            value={form.aboutMe}
            onChange={(e) => set("aboutMe", e.target.value)}
            className={`${inputCls} w-full`}
          />
        </div>
      </SectionPanel>

      <div>
        <button
          type="submit"
          className="bg-fb-navy px-4 py-1 text-[13px] text-white"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}
