"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Full signup form. Captures every field in the `User` data model
 * (`docs/data-model.md`), then POSTs the payload to
 * `/api/users/register` which validates the Auth0 session, persists to
 * Firestore, and returns 201 on success.
 *
 * Identity (email, photoURL, sub) is NOT submitted — the API reads it from
 * the session so the client can't impersonate another user.
 */

type Sex = "male" | "female" | "other";
type RelationshipStatus =
  | "single"
  | "in_relationship"
  | "engaged"
  | "married"
  | "its_complicated";
type InterestedIn = "men" | "women" | "both";
type LookingFor =
  | "friendship"
  | "dating"
  | "random_play"
  | "whatever_i_can_get";

type FormState = {
  displayName: string;
  status: string;
  network: string;
  aboutMe: string;
  basic: {
    sex: Sex | "";
    birthday: string;
    hometown: string;
    currentResidence: string;
    phone: string;
    aim: string;
    website: string;
  };
  academic: {
    classYear: string;
    concentration: string;
    highSchool: string;
    coursesText: string;
  };
  social: {
    relationshipStatus: RelationshipStatus | "";
    interestedIn: InterestedIn | "";
    lookingFor: LookingFor[];
    politicalViews: string;
    religiousViews: string;
  };
  favorites: {
    books: string;
    movies: string;
    music: string;
    tv: string;
    quotes: string;
  };
};

const LOOKING_FOR_OPTIONS: { value: LookingFor; label: string }[] = [
  { value: "friendship", label: "Friendship" },
  { value: "dating", label: "Dating" },
  { value: "random_play", label: "Random play" },
  { value: "whatever_i_can_get", label: "Whatever I can get" },
];

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length === 0 ? null : t;
}

function buildPayload(state: FormState) {
  return {
    displayName: state.displayName.trim(),
    status: emptyToNull(state.status),
    network: emptyToNull(state.network),
    aboutMe: emptyToNull(state.aboutMe),
    basic: {
      sex: state.basic.sex || null,
      birthday: emptyToNull(state.basic.birthday),
      hometown: emptyToNull(state.basic.hometown),
      currentResidence: emptyToNull(state.basic.currentResidence),
      phone: emptyToNull(state.basic.phone),
      aim: emptyToNull(state.basic.aim),
      website: emptyToNull(state.basic.website),
    },
    academic: {
      classYear: state.academic.classYear.trim()
        ? Number.parseInt(state.academic.classYear, 10)
        : null,
      concentration: emptyToNull(state.academic.concentration),
      highSchool: emptyToNull(state.academic.highSchool),
      courses: state.academic.coursesText
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0),
    },
    social: {
      relationshipStatus: state.social.relationshipStatus || null,
      interestedIn: state.social.interestedIn || null,
      lookingFor: state.social.lookingFor,
      politicalViews: emptyToNull(state.social.politicalViews),
      religiousViews: emptyToNull(state.social.religiousViews),
    },
    favorites: {
      books: emptyToNull(state.favorites.books),
      movies: emptyToNull(state.favorites.movies),
      music: emptyToNull(state.favorites.music),
      tv: emptyToNull(state.favorites.tv),
      quotes: emptyToNull(state.favorites.quotes),
    },
  };
}

export function RegistrationForm({
  email,
  name,
  picture,
  returnTo,
}: {
  email: string;
  name: string;
  picture: string | null;
  returnTo: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    displayName: name,
    status: "",
    network: "",
    aboutMe: "",
    basic: {
      sex: "",
      birthday: "",
      hometown: "",
      currentResidence: "",
      phone: "",
      aim: "",
      website: "",
    },
    academic: {
      classYear: "",
      concentration: "",
      highSchool: "",
      coursesText: "",
    },
    social: {
      relationshipStatus: "",
      interestedIn: "",
      lookingFor: [],
      politicalViews: "",
      religiousViews: "",
    },
    favorites: { books: "", movies: "", music: "", tv: "", quotes: "" },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ form: buildPayload(state), returnTo }),
      });
      const body = (await res.json().catch(() => null)) as {
        redirectTo?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(body?.error ?? `Registration failed (HTTP ${res.status})`);
        setBusy(false);
        return;
      }
      const dest = body?.redirectTo || returnTo || "/feed";
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const toggleLookingFor = (v: LookingFor) =>
    setState((s) => ({
      ...s,
      social: {
        ...s.social,
        lookingFor: s.social.lookingFor.includes(v)
          ? s.social.lookingFor.filter((x) => x !== v)
          : [...s.social.lookingFor, v],
      },
    }));

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-[640px] border border-app-border bg-app-surface px-8 py-9 shadow-[0_1px_2px_rgba(17,17,24,0.04),0_8px_24px_rgba(17,17,24,0.06)]"
    >
      <header className="mb-6 text-center">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-app-brand">
          Social Network 1.0
        </div>
        <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight text-app-text-primary">
          Finish creating your profile
        </h1>
        <p className="mt-2 text-sm leading-snug text-app-text-secondary">
          Tell us a bit about yourself. All fields except your name are optional
          — you can edit them later.
        </p>
      </header>

      <IdentityHeader email={email} name={name} picture={picture} />

      <input type="hidden" name="returnTo" value={returnTo} />

      <Section title="The basics">
        <Field label="Display name *">
          <input
            required
            maxLength={80}
            value={state.displayName}
            onChange={(e) =>
              setState((s) => ({ ...s, displayName: e.target.value }))
            }
            className={inputCls}
          />
        </Field>
        <Field label='Status ("Mark is thinking about…")'>
          <input
            maxLength={280}
            value={state.status}
            onChange={(e) =>
              setState((s) => ({ ...s, status: e.target.value }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Network (e.g. harvard, stanford)">
          <input
            maxLength={80}
            value={state.network}
            onChange={(e) =>
              setState((s) => ({ ...s, network: e.target.value }))
            }
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Basic info">
        <Field label="Sex">
          <select
            value={state.basic.sex}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                basic: { ...s.basic, sex: e.target.value as Sex | "" },
              }))
            }
            className={inputCls}
          >
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Birthday">
          <input
            type="date"
            value={state.basic.birthday}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                basic: { ...s.basic, birthday: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Hometown">
          <input
            maxLength={120}
            value={state.basic.hometown}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                basic: { ...s.basic, hometown: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Current residence">
          <input
            maxLength={120}
            value={state.basic.currentResidence}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                basic: { ...s.basic, currentResidence: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Phone">
          <input
            maxLength={40}
            value={state.basic.phone}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                basic: { ...s.basic, phone: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="AIM screen name">
          <input
            maxLength={40}
            value={state.basic.aim}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                basic: { ...s.basic, aim: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Website (https://…)">
          <input
            type="url"
            value={state.basic.website}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                basic: { ...s.basic, website: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Academic">
        <Field label="Class year">
          <input
            type="number"
            min={1900}
            max={2100}
            value={state.academic.classYear}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                academic: { ...s.academic, classYear: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Concentration">
          <input
            maxLength={120}
            value={state.academic.concentration}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                academic: { ...s.academic, concentration: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="High school">
          <input
            maxLength={160}
            value={state.academic.highSchool}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                academic: { ...s.academic, highSchool: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Courses (comma-separated)">
          <input
            value={state.academic.coursesText}
            placeholder="CS50, Math 55, …"
            onChange={(e) =>
              setState((s) => ({
                ...s,
                academic: { ...s.academic, coursesText: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Social">
        <Field label="Relationship status">
          <select
            value={state.social.relationshipStatus}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                social: {
                  ...s.social,
                  relationshipStatus: e.target.value as RelationshipStatus | "",
                },
              }))
            }
            className={inputCls}
          >
            <option value="">—</option>
            <option value="single">Single</option>
            <option value="in_relationship">In a relationship</option>
            <option value="engaged">Engaged</option>
            <option value="married">Married</option>
            <option value="its_complicated">It&apos;s complicated</option>
          </select>
        </Field>
        <Field label="Interested in">
          <select
            value={state.social.interestedIn}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                social: {
                  ...s.social,
                  interestedIn: e.target.value as InterestedIn | "",
                },
              }))
            }
            className={inputCls}
          >
            <option value="">—</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="both">Both</option>
          </select>
        </Field>
        <Field label="Looking for">
          <div className="flex flex-wrap gap-3">
            {LOOKING_FOR_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-[13px] text-app-text-primary"
              >
                <input
                  type="checkbox"
                  checked={state.social.lookingFor.includes(opt.value)}
                  onChange={() => toggleLookingFor(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Political views">
          <input
            maxLength={120}
            value={state.social.politicalViews}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                social: { ...s.social, politicalViews: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Religious views">
          <input
            maxLength={120}
            value={state.social.religiousViews}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                social: { ...s.social, religiousViews: e.target.value },
              }))
            }
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Favorites">
        {(["books", "movies", "music", "tv", "quotes"] as const).map((k) => (
          <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
            <input
              maxLength={500}
              value={state.favorites[k]}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  favorites: { ...s.favorites, [k]: e.target.value },
                }))
              }
              className={inputCls}
            />
          </Field>
        ))}
      </Section>

      <Section title="About me">
        <Field label="Bio">
          <textarea
            rows={4}
            maxLength={2000}
            value={state.aboutMe}
            onChange={(e) =>
              setState((s) => ({ ...s, aboutMe: e.target.value }))
            }
            className={`${inputCls} h-24 resize-y`}
          />
        </Field>
      </Section>

      {error ? (
        <div
          role="alert"
          className="mb-4 border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-900"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex h-11 w-full items-center justify-center bg-app-brand text-sm font-semibold text-white transition-colors hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Create my account"}
        </button>
        <a
          href="/auth/logout"
          className="flex h-11 w-full items-center justify-center border border-app-border bg-app-surface text-sm font-medium text-app-text-primary transition-colors hover:border-app-brand hover:bg-app-surface-raised hover:no-underline"
        >
          Use a different account
        </a>
      </div>
    </form>
  );
}

const inputCls =
  "h-9 w-full border border-app-border bg-app-surface px-3 text-[13px] text-app-text-primary focus:border-app-brand focus:outline-none";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mb-5 border border-app-border bg-app-surface-raised p-4">
      <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-brand">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-app-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

function IdentityHeader({
  email,
  name,
  picture,
}: {
  email: string;
  name: string;
  picture: string | null;
}) {
  return (
    <div className="mb-5 flex items-center gap-3 border border-app-border bg-app-surface-raised p-3">
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={picture}
          alt=""
          className="h-10 w-10 border border-app-border object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="h-10 w-10 border border-app-border bg-app-surface" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-app-text-primary">
          {name}
        </p>
        <p className="truncate text-[12px] text-app-text-secondary">{email}</p>
      </div>
    </div>
  );
}
