import { SectionPanel } from "@/app/_components/SectionPanel";
import { SectionStrip } from "@/app/_components/SectionStrip";
import type { User } from "@/src/types";

type InformationPanelProps = {
  user: User;
  canEdit: boolean;
};

type Row = { label: string; value: string | null };

function formatEnum(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatBirthday(iso: string | null): string | null {
  if (!iso) return null;
  // Parse yyyy-mm-dd without timezone surprises.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderRows(rows: Row[]) {
  const visible = rows.filter((r) => r.value != null && r.value !== "");
  if (visible.length === 0) return null;
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-1 px-3 py-2 text-[13px]">
      {visible.map((r) => (
        <div key={r.label} className="contents">
          <dt className="font-bold text-fb-text">{r.label}:</dt>
          <dd className="text-fb-text">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SubSection({
  title,
  rows,
  canEdit,
}: {
  title: string;
  rows: Row[];
  canEdit: boolean;
}) {
  const body = renderRows(rows);
  if (!body) return null;
  return (
    <div>
      <SectionStrip
        title={title}
        editHref={canEdit ? "/profile/edit" : undefined}
      />
      {body}
    </div>
  );
}

export function InformationPanel({ user, canEdit }: InformationPanelProps) {
  const accountRows: Row[] = [
    { label: "Name", value: user.displayName },
    { label: "Email", value: canEdit ? user.email : null },
    {
      label: "Member Since",
      value: formatMemberSince(user.createdAt as unknown as string),
    },
    { label: "Network", value: user.network },
  ];

  const basicRows: Row[] = [
    { label: "Sex", value: user.basic.sex ? formatEnum(user.basic.sex) : null },
    { label: "Birthday", value: formatBirthday(user.basic.birthday) },
    { label: "Hometown", value: user.basic.hometown },
    { label: "Current Residence", value: user.basic.currentResidence },
  ];

  const contactRows: Row[] = [
    { label: "Email", value: canEdit ? user.email : null },
    { label: "Phone", value: user.basic.phone },
    { label: "AIM", value: user.basic.aim },
    { label: "Website", value: user.basic.website },
  ];

  const academicRows: Row[] = [
    {
      label: "Class Year",
      value:
        user.academic.classYear != null
          ? String(user.academic.classYear)
          : null,
    },
    { label: "Concentration", value: user.academic.concentration },
    { label: "High School", value: user.academic.highSchool },
    {
      label: "Courses",
      value:
        user.academic.courses.length > 0
          ? user.academic.courses.join(", ")
          : null,
    },
  ];

  const personalRows: Row[] = [
    {
      label: "Relationship Status",
      value: user.social.relationshipStatus
        ? formatEnum(user.social.relationshipStatus)
        : null,
    },
    {
      label: "Interested In",
      value: user.social.interestedIn
        ? formatEnum(user.social.interestedIn)
        : null,
    },
    {
      label: "Looking For",
      value:
        user.social.lookingFor.length > 0
          ? user.social.lookingFor.map(formatEnum).join(", ")
          : null,
    },
    { label: "Political Views", value: user.social.politicalViews },
    { label: "Religious Views", value: user.social.religiousViews },
  ];

  const favoriteRows: Row[] = [
    { label: "Books", value: user.favorites.books },
    { label: "Movies", value: user.favorites.movies },
    { label: "Music", value: user.favorites.music },
    { label: "TV", value: user.favorites.tv },
    { label: "Quotes", value: user.favorites.quotes },
  ];

  const aboutRows: Row[] = [{ label: "About Me", value: user.aboutMe }];

  return (
    <SectionPanel title="Information">
      <SubSection title="Account Info" rows={accountRows} canEdit={canEdit} />
      <SubSection title="Basic Info" rows={basicRows} canEdit={canEdit} />
      <SubSection title="Contact Info" rows={contactRows} canEdit={canEdit} />
      <SubSection title="Academic Info" rows={academicRows} canEdit={canEdit} />
      <SubSection title="Personal Info" rows={personalRows} canEdit={canEdit} />
      <SubSection title="Favorites" rows={favoriteRows} canEdit={canEdit} />
      <SubSection title="About Me" rows={aboutRows} canEdit={canEdit} />
    </SectionPanel>
  );
}
