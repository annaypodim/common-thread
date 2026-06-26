"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ActivityListEntry, ActivityPlatform, ActivitySourceKind } from "@/lib/activity-lists";
import type { UserProfileData } from "@/lib/profile";

const UC_CATEGORIES = [
  "Awards or Honors",
  "Educational Preparation Programs",
  "Extracurricular Activities",
  "Other Coursework",
  "Volunteering/Community Service",
  "Work Experience",
];

type RawItem = {
  key: string;
  id?: string;
  kind: ActivitySourceKind;
  title: string;
  activityType: string;
  organization: string;
  position: string;
  description: string;
  grades: Pick<ActivityListEntry, "grade_9" | "grade_10" | "grade_11" | "grade_12">;
  hours: string;
  weeks: string;
};

// Headline for a listed item: leadership position if one exists, otherwise the
// organization (honors just use their title).
function rawPrimary(raw: RawItem) {
  if (raw.kind === "honor") return raw.title;
  return raw.position || raw.organization || raw.title;
}

// Sub-line under the headline: the extracurricular type, plus the organization
// when a position is shown up top (so the org isn't lost).
function rawSecondary(raw: RawItem) {
  if (raw.kind === "honor") return "Award";
  const type = raw.activityType || "Activity";
  if (raw.position && raw.organization) return `${type} / ${raw.organization}`;
  return type;
}

function makeEntry(raw: RawItem, platform: ActivityPlatform, sortOrder: number): ActivityListEntry {
  return {
    platform,
    source_kind: raw.kind,
    source_id: raw.id ?? null,
    category:
      platform === "uc"
        ? raw.kind === "honor"
          ? "Awards or Honors"
          : "Extracurricular Activities"
        : raw.kind === "honor"
          ? "Honor"
          : "Activity",
    title: raw.title,
    position_title: raw.position,
    organization: raw.organization,
    description: raw.description,
    ...raw.grades,
    hours_per_week: raw.hours,
    weeks_per_year: raw.weeks,
    sort_order: sortOrder,
  };
}

function entryKey(entry: ActivityListEntry) {
  return `${entry.source_kind}:${entry.source_id ?? `${entry.title}:${entry.organization}`}`;
}

function limitFor(entry: ActivityListEntry) {
  if (entry.platform === "uc") return 350;
  return entry.source_kind === "honor" ? 100 : 150;
}

function CharacterCount({ value, limit }: { value: string; limit: number }) {
  const remaining = limit - value.length;
  return (
    <span className={`font-mono text-[11px] ${remaining < 0 ? "text-red-700" : remaining < 20 ? "text-amber-700" : "text-text-tertiary"}`}>
      {value.length}/{limit}
    </span>
  );
}

function DraftCard({
  entry,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  entry: ActivityListEntry;
  index: number;
  total: number;
  onChange: (updates: Partial<ActivityListEntry>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const descriptionLimit = limitFor(entry);
  const isHonor = entry.platform === "common_app" && entry.source_kind === "honor";
  const inputClass = "mt-1.5 w-full rounded-lg border border-border-soft bg-white px-3 py-2 text-sm outline-none focus:border-forest";
  const summaryDetail = [entry.position_title, entry.organization].filter(Boolean).join(" · ");

  return (
    <article className="overflow-hidden rounded-xl border border-border-soft bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-border-soft bg-[#f7f8f6] px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="px-1 text-sm text-text-secondary"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 truncate text-left font-mono text-xs text-text-secondary"
        >
          {String(index + 1).padStart(2, "0")} · {entry.source_kind === "honor" ? "award" : "activity"}
        </button>
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="px-1 text-sm disabled:opacity-25" aria-label="Move up">↑</button>
        <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="px-1 text-sm disabled:opacity-25" aria-label="Move down">↓</button>
        <button type="button" onClick={onRemove} className="ml-1 text-xs font-medium text-red-700">Remove</button>
      </div>
      {!expanded ? (
        <button type="button" onClick={() => setExpanded(true)} className="block w-full px-3 py-3 text-left">
          <p className="truncate text-sm font-semibold text-foreground">{entry.title || "Untitled"}</p>
          {summaryDetail && <p className="mt-0.5 truncate text-xs text-text-secondary">{summaryDetail}</p>}
          {entry.description && <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{entry.description}</p>}
        </button>
      ) : (
      <div className="space-y-3 p-3">
        {entry.platform === "uc" && (
          <label className="block text-xs font-medium text-text-secondary">
            UC category
            <select value={entry.category} onChange={(event) => onChange({ category: event.target.value })} className={inputClass}>
              {UC_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
        )}

        <label className="block text-xs font-medium text-text-secondary">
          {isHonor ? "Award name" : entry.source_kind === "honor" ? "Award / program name" : "Activity name"}
          <input value={entry.title} onChange={(event) => onChange({ title: event.target.value })} className={inputClass} />
        </label>

        {!isHonor && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="block text-xs font-medium text-text-secondary">
              <span className="flex items-center justify-between gap-2">
                <span>Position / leadership</span>
                {entry.platform === "common_app" && <CharacterCount value={entry.position_title} limit={50} />}
              </span>
              <input
                value={entry.position_title}
                maxLength={entry.platform === "common_app" ? 50 : undefined}
                onChange={(event) => onChange({ position_title: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-medium text-text-secondary">
              <span className="flex items-center justify-between gap-2">
                <span>Organization</span>
                {entry.platform === "common_app" && <CharacterCount value={entry.organization} limit={100} />}
              </span>
              <input
                value={entry.organization}
                maxLength={entry.platform === "common_app" ? 100 : undefined}
                onChange={(event) => onChange({ organization: event.target.value })}
                className={inputClass}
              />
            </label>
          </div>
        )}

        <label className="block text-xs font-medium text-text-secondary">
          <span className="flex items-center justify-between gap-2">
            <span>{isHonor ? "Award description" : "Description"}</span>
            <CharacterCount value={entry.description} limit={descriptionLimit} />
          </span>
          <textarea
            value={entry.description}
            maxLength={descriptionLimit}
            rows={entry.platform === "uc" ? 5 : 3}
            onChange={(event) => onChange({ description: event.target.value })}
            className={`${inputClass} resize-y`}
          />
        </label>

        <fieldset>
          <legend className="text-xs font-medium text-text-secondary">Participation grades</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([9, 10, 11, 12] as const).map((grade) => {
              const field = `grade_${grade}` as const;
              return (
                <label key={grade} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${entry[field] ? "border-forest bg-forest text-white" : "border-border-soft bg-white text-text-secondary"}`}>
                  <input type="checkbox" checked={entry[field]} onChange={(event) => onChange({ [field]: event.target.checked })} className="sr-only" />
                  Grade {grade}
                </label>
              );
            })}
          </div>
        </fieldset>

        {!isHonor && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-text-secondary">
              Hours / week
              <input type="number" min="0" step="0.5" value={entry.hours_per_week} onChange={(event) => onChange({ hours_per_week: event.target.value })} className={inputClass} />
            </label>
            <label className="block text-xs font-medium text-text-secondary">
              Weeks / year
              <input type="number" min="0" max="52" value={entry.weeks_per_year} onChange={(event) => onChange({ weeks_per_year: event.target.value })} className={inputClass} />
            </label>
          </div>
        )}
      </div>
      )}
    </article>
  );
}

export function ActivityListWorkspace({
  profile,
  initialEntries,
  saveAction,
}: {
  profile: UserProfileData;
  initialEntries: ActivityListEntry[];
  saveAction: (entries: ActivityListEntry[]) => Promise<{ error?: string; success?: boolean }>;
}) {
  const rawItems = useMemo<RawItem[]>(() => [
    ...profile.activities.map((activity, index) => ({
      key: `activity:${activity.id ?? index}`,
      id: activity.id,
      kind: "activity" as const,
      title: activity.activity_type || activity.position_title || `Activity ${index + 1}`,
      activityType: activity.activity_type ?? "",
      organization: activity.organization,
      position: activity.position_title,
      description: activity.description,
      grades: { grade_9: activity.grade_9, grade_10: activity.grade_10, grade_11: activity.grade_11, grade_12: activity.grade_12 },
      hours: activity.avg_hours_per_week?.toString() ?? "",
      weeks: activity.avg_weeks_per_year?.toString() ?? "",
    })),
    ...profile.honors.map((honor, index) => ({
      key: `honor:${honor.id ?? index}`,
      id: honor.id,
      kind: "honor" as const,
      title: honor.title || `Honor ${index + 1}`,
      activityType: "",
      organization: "",
      position: "",
      description: honor.achievement_description || honor.eligibility_requirements,
      grades: { grade_9: honor.grade_9, grade_10: honor.grade_10, grade_11: honor.grade_11, grade_12: honor.grade_12 },
      hours: "",
      weeks: "",
    })),
  ], [profile]);

  const [entries, setEntries] = useState(initialEntries);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const common = entries.filter((entry) => entry.platform === "common_app");
  const uc = entries.filter((entry) => entry.platform === "uc");
  const selected = (platform: ActivityPlatform, raw: RawItem) => entries.some((entry) => entry.platform === platform && entryKey(entry) === `${raw.kind}:${raw.id ?? `${raw.title}:${raw.organization}`}`);

  function toggle(raw: RawItem, platform: ActivityPlatform) {
    const key = `${raw.kind}:${raw.id ?? `${raw.title}:${raw.organization}`}`;
    const existing = entries.find((entry) => entry.platform === platform && entryKey(entry) === key);
    if (existing) {
      setEntries((current) => current.filter((entry) => entry !== existing));
      setMessage("");
      return;
    }
    const platformEntries = entries.filter((entry) => entry.platform === platform);
    const commonKindCount = platformEntries.filter((entry) => entry.source_kind === raw.kind).length;
    const atLimit = platform === "uc" ? platformEntries.length >= 20 : raw.kind === "honor" ? commonKindCount >= 5 : commonKindCount >= 10;
    if (atLimit) {
      setMessage(platform === "uc" ? "UC allows 20 total entries." : raw.kind === "honor" ? "Common App allows 5 honors." : "Common App allows 10 activities.");
      return;
    }
    setEntries((current) => [...current, makeEntry(raw, platform, platformEntries.length)]);
    setMessage("");
  }

  function update(platform: ActivityPlatform, index: number, updates: Partial<ActivityListEntry>) {
    setEntries((current) => {
      let seen = -1;
      return current.map((entry) => {
        if (entry.platform !== platform) return entry;
        seen += 1;
        return seen === index ? { ...entry, ...updates } : entry;
      });
    });
    setMessage("");
  }

  function remove(platform: ActivityPlatform, index: number) {
    setEntries((current) => {
      let seen = -1;
      return current.filter((entry) => {
        if (entry.platform !== platform) return true;
        seen += 1;
        return seen !== index;
      });
    });
  }

  function move(platform: ActivityPlatform, index: number, direction: -1 | 1) {
    const platformEntries = entries.filter((entry) => entry.platform === platform);
    const target = index + direction;
    if (target < 0 || target >= platformEntries.length) return;
    [platformEntries[index], platformEntries[target]] = [platformEntries[target], platformEntries[index]];
    let cursor = 0;
    setEntries((current) => current.map((entry) => entry.platform === platform ? platformEntries[cursor++] : entry));
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const normalized = entries.map((entry) => ({ ...entry, sort_order: entries.filter((candidate) => candidate.platform === entry.platform).indexOf(entry) }));
      const result = await saveAction(normalized);
      setMessage(result.error ? result.error : "All Common App and UC drafts are saved.");
    });
  }

  const commonActivities = common.filter((entry) => entry.source_kind === "activity").length;
  const commonHonors = common.filter((entry) => entry.source_kind === "honor").length;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-forest-muted">Profile → application drafts</p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">Activity List Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Keep your profile expansive. Select only the experiences that belong in each application, then edit and order each version independently.</p>
        </div>
        <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {isPending ? "Saving…" : "Save both versions"}
        </button>
      </header>

      {message && <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.startsWith("All") ? "bg-green-100 text-green-900" : "bg-red-50 text-red-800"}`}>{message}</p>}

      <section className="mt-6 rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Listed activities</h2>
            <p className="text-sm text-text-secondary">Checking a platform copies the current profile text into an independent draft.</p>
          </div>
          <Link href="/profile" className="text-sm font-medium text-forest underline underline-offset-4">Edit raw profile</Link>
        </div>
        {rawItems.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border-soft bg-ivory/50 p-5 text-sm text-text-secondary">Your profile has no activities or honors yet. Add everything you have done to the raw profile first.</div>
        ) : (
          <div className="mt-4 divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft">
            {rawItems.map((raw) => (
              <div key={raw.key} className="grid gap-3 bg-[#fafbf9] px-3 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{rawPrimary(raw)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-text-tertiary">{rawSecondary(raw)}</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={selected("common_app", raw)} onChange={() => toggle(raw, "common_app")} className="accent-[#1B3A2D]" /> Common App</label>
                <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={selected("uc", raw)} onChange={() => toggle(raw, "uc")} className="accent-[#1B3A2D]" /> UC App</label>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 grid items-start gap-5 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border-soft bg-[#eef5f0] p-3 sm:p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-green-800">Common App activity list</p><h2 className="mt-1 text-xl font-semibold">Common App</h2></div>
            <div className="text-right font-mono text-[11px] text-text-secondary"><p>{commonActivities}/10 activities</p><p>{commonHonors}/5 honors</p></div>
          </div>
          <p className="mb-4 rounded-lg bg-white/70 px-3 py-2 text-xs text-text-secondary">Be concise and action-first. Activity descriptions allow 150 characters; award descriptions allow 100.</p>
          <div className="space-y-3">{common.length ? common.map((entry, index) => <DraftCard key={`${entryKey(entry)}-${index}`} entry={entry} index={index} total={common.length} onChange={(updates) => update("common_app", index, updates)} onMove={(direction) => move("common_app", index, direction)} onRemove={() => remove("common_app", index)} />) : <EmptyDiff />}</div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border-soft bg-[#f2f1f8] p-3 sm:p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-violet-800">UC activity list</p><h2 className="mt-1 text-xl font-semibold">UC Activities + Awards</h2></div>
            <p className="font-mono text-[11px] text-text-secondary">{uc.length}/20 total</p>
          </div>
          <p className="mb-4 rounded-lg bg-white/70 px-3 py-2 text-xs text-text-secondary">Choose the required UC category and use up to 350 characters to add context, impact, and scope.</p>
          <div className="space-y-3">{uc.length ? uc.map((entry, index) => <DraftCard key={`${entryKey(entry)}-${index}`} entry={entry} index={index} total={uc.length} onChange={(updates) => update("uc", index, updates)} onMove={(direction) => move("uc", index, direction)} onRemove={() => remove("uc", index)} />) : <EmptyDiff />}</div>
        </div>
      </section>
    </div>
  );
}

function EmptyDiff() {
  return <div className="rounded-xl border border-dashed border-border-soft bg-white/60 p-5 font-mono text-xs text-text-tertiary">{"// Select profile entries above to begin this version."}</div>;
}
