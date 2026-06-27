"use client";

import { useMemo, useState, useTransition } from "react";
import type { ActivityListEntry, ActivityPlatform, ActivitySourceKind } from "@/lib/activity-lists";
import type { Activity, Honor, UserProfileData } from "@/lib/profile";

const UC_CATEGORIES = [
  "Awards or Honors",
  "Educational Preparation Programs",
  "Extracurricular Activities",
  "Other Coursework",
  "Volunteering/Community Service",
  "Work Experience",
];

const ACTIVITY_TYPES = [
  "Educational Preparation Program",
  "Extracurricular Activity",
  "Other Coursework",
  "Volunteer/Community Service",
  "Work Experience",
];

const RECOGNITION_LEVELS = ["School", "State", "National", "International"];

type ActivityItem = Activity & { _key: string };
type HonorItem = Honor & { _key: string };

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

let keyCounter = 0;
function makeKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  keyCounter += 1;
  return `${prefix}-${Date.now()}-${keyCounter}`;
}

const emptyActivity = (): ActivityItem => ({
  _key: makeKey("activity"),
  activity_type: "",
  position_title: "",
  organization: "",
  description: "",
  grade_9: false,
  grade_10: false,
  grade_11: false,
  grade_12: false,
  avg_hours_per_week: "",
  avg_weeks_per_year: "",
});

const emptyHonor = (): HonorItem => ({
  _key: makeKey("honor"),
  title: "",
  grade_9: false,
  grade_10: false,
  grade_11: false,
  grade_12: false,
  recognition_level: "School",
  eligibility_requirements: "",
  achievement_description: "",
});

// Headline for a listed item: leadership position if one exists, otherwise the
// organization (honors just use their title).
function rawPrimary(raw: RawItem) {
  if (raw.kind === "honor") return raw.title || "Untitled award";
  return raw.position || raw.organization || raw.title || "Untitled activity";
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

function rawMatchKey(raw: RawItem) {
  return `${raw.kind}:${raw.id ?? `${raw.title}:${raw.organization}`}`;
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

const fieldClass = "mt-1.5 w-full rounded-lg border border-border-soft bg-white px-3 py-2 text-sm outline-none focus:border-forest";

function GradeChips({
  item,
  onChange,
}: {
  item: { grade_9: boolean; grade_10: boolean; grade_11: boolean; grade_12: boolean };
  onChange: (updates: Partial<Pick<Activity, "grade_9" | "grade_10" | "grade_11" | "grade_12">>) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-text-secondary">Participation grades</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {([9, 10, 11, 12] as const).map((grade) => {
          const field = `grade_${grade}` as const;
          return (
            <label key={grade} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${item[field] ? "border-forest bg-forest text-white" : "border-border-soft bg-white text-text-secondary"}`}>
              <input type="checkbox" checked={item[field]} onChange={(event) => onChange({ [field]: event.target.checked })} className="sr-only" />
              Grade {grade}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DraftCard({
  entry,
  index,
  total,
  secondary,
  onChange,
  onMove,
  onRemove,
}: {
  entry: ActivityListEntry;
  index: number;
  total: number;
  secondary: string;
  onChange: (updates: Partial<ActivityListEntry>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const descriptionLimit = limitFor(entry);
  const isHonor = entry.platform === "common_app" && entry.source_kind === "honor";
  const inputClass = fieldClass;
  const summaryPrimary = entry.position_title || entry.organization || entry.title || "Untitled";

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
          <p className="truncate text-sm font-semibold text-foreground">{summaryPrimary}</p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">{secondary}</p>
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
          <div className="grid gap-3 sm:grid-cols-2">
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

        <GradeChips item={entry} onChange={onChange} />

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
  saveAction: (payload: {
    activities: Activity[];
    honors: Honor[];
    entries: ActivityListEntry[];
  }) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    profile.activities.map((activity, index) => ({
      ...activity,
      _key: activity.id ?? `activity-initial-${index}`,
      avg_hours_per_week: activity.avg_hours_per_week?.toString() ?? "",
      avg_weeks_per_year: activity.avg_weeks_per_year?.toString() ?? "",
    }))
  );
  const [honors, setHonors] = useState<HonorItem[]>(() =>
    profile.honors.map((honor, index) => ({ ...honor, _key: honor.id ?? `honor-initial-${index}` }))
  );
  const [openItemKeys, setOpenItemKeys] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState(initialEntries);
  const [view, setView] = useState<ActivityPlatform>("common_app");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const rawItems = useMemo<RawItem[]>(() => [
    ...activities.map((activity, index) => ({
      key: activity._key,
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
    ...honors.map((honor, index) => ({
      key: honor._key,
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
  ], [activities, honors]);

  const common = entries.filter((entry) => entry.platform === "common_app");
  const uc = entries.filter((entry) => entry.platform === "uc");
  const selected = (platform: ActivityPlatform, raw: RawItem) =>
    entries.some((entry) => entry.platform === platform && entryKey(entry) === rawMatchKey(raw));

  // Summary sub-line for a draft, mirroring the Listed activities format above:
  // "type / organization". The activity type comes from the matching master
  // item (entries don't store it); the organization is the entry's own value.
  function secondaryForEntry(entry: ActivityListEntry): string {
    if (entry.source_kind === "honor") return "Award";
    const raw = rawItems.find((item) => item.kind === "activity" && rawMatchKey(item) === entryKey(entry));
    const type = raw?.activityType || "Activity";
    const org = entry.organization || raw?.organization || "";
    return org ? `${type} / ${org}` : type;
  }

  function toggleOpen(key: string) {
    setOpenItemKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateActivity(key: string, updates: Partial<Activity>) {
    setActivities((current) => current.map((activity) => (activity._key === key ? { ...activity, ...updates } : activity)));
    setMessage("");
  }

  function updateHonor(key: string, updates: Partial<Honor>) {
    setHonors((current) => current.map((honor) => (honor._key === key ? { ...honor, ...updates } : honor)));
    setMessage("");
  }

  function addActivity() {
    const item = emptyActivity();
    setActivities((current) => [...current, item]);
    setOpenItemKeys((current) => new Set(current).add(item._key));
    setMessage("");
  }

  function addHonor() {
    const item = emptyHonor();
    setHonors((current) => [...current, item]);
    setOpenItemKeys((current) => new Set(current).add(item._key));
    setMessage("");
  }

  function removeRawEntries(raw: RawItem) {
    setEntries((current) => current.filter((entry) => entryKey(entry) !== rawMatchKey(raw)));
  }

  function removeActivity(raw: RawItem) {
    removeRawEntries(raw);
    setActivities((current) => current.filter((activity) => activity._key !== raw.key));
    setMessage("");
  }

  function removeHonor(raw: RawItem) {
    removeRawEntries(raw);
    setHonors((current) => current.filter((honor) => honor._key !== raw.key));
    setMessage("");
  }

  function toggle(raw: RawItem, platform: ActivityPlatform) {
    const key = rawMatchKey(raw);
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
      const result = await saveAction({
        activities: activities.map(({ _key, ...activity }) => { void _key; return activity; }),
        honors: honors.map(({ _key, ...honor }) => { void _key; return honor; }),
        entries: normalized,
      });
      setMessage(result.error ? result.error : "Your activities, awards, and both application drafts are saved.");
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
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">Add every activity and award here, then select the ones that belong in each application and tailor the wording per platform.</p>
        </div>
        <button type="button" onClick={save} disabled={isPending} className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {isPending ? "Saving…" : "Save"}
        </button>
      </header>

      {message && <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.startsWith("Your") ? "bg-green-100 text-green-900" : "bg-red-50 text-red-800"}`}>{message}</p>}

      <section className="mt-6 rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Listed activities</h2>
            <p className="text-sm text-text-secondary">Your master list. Checking a platform copies the current text into an independent draft.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addActivity} className="rounded-full border border-forest bg-forest px-4 py-2 text-sm font-medium text-white">+ Add activity</button>
            <button type="button" onClick={addHonor} className="rounded-full border border-forest px-4 py-2 text-sm font-medium text-forest">+ Add award</button>
          </div>
        </div>
        {rawItems.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border-soft bg-ivory/50 p-5 text-sm text-text-secondary">No activities or awards yet. Use the buttons above to add everything you have done.</div>
        ) : (
          <div className="mt-4 divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft">
            {rawItems.map((raw) => {
              const isOpen = openItemKeys.has(raw.key);
              return (
                <div key={raw.key} className="bg-[#fafbf9]">
                  <div className="grid gap-3 px-3 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                    <button type="button" onClick={() => toggleOpen(raw.key)} className="min-w-0 text-left" aria-expanded={isOpen}>
                      <p className="truncate text-sm font-medium text-foreground">{rawPrimary(raw)}</p>
                      <p className="mt-0.5 truncate text-[11px] text-text-tertiary">{rawSecondary(raw)}</p>
                    </button>
                    <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={selected("common_app", raw)} onChange={() => toggle(raw, "common_app")} className="accent-[#1B3A2D]" /> Common App</label>
                    <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={selected("uc", raw)} onChange={() => toggle(raw, "uc")} className="accent-[#1B3A2D]" /> UC App</label>
                    <button type="button" onClick={() => toggleOpen(raw.key)} className="justify-self-end px-1 text-sm text-text-secondary" aria-label={isOpen ? "Collapse" : "Edit"}>{isOpen ? "▾" : "✎"}</button>
                  </div>
                  {isOpen && (raw.kind === "activity"
                    ? <ActivityEditor item={activities.find((a) => a._key === raw.key)!} onChange={(updates) => updateActivity(raw.key, updates)} onRemove={() => removeActivity(raw)} />
                    : <HonorEditor item={honors.find((h) => h._key === raw.key)!} onChange={(updates) => updateHonor(raw.key, updates)} onRemove={() => removeHonor(raw)} />)}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="inline-flex rounded-full border border-border-soft bg-white p-1">
          <button
            type="button"
            onClick={() => setView("common_app")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${view === "common_app" ? "bg-forest text-white" : "text-text-secondary"}`}
          >
            Common App
          </button>
          <button
            type="button"
            onClick={() => setView("uc")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${view === "uc" ? "bg-forest text-white" : "text-text-secondary"}`}
          >
            UC App
          </button>
        </div>

        {view === "common_app" ? (
          <div className="mt-4 min-w-0 rounded-2xl border border-border-soft bg-[#eef5f0] p-3 sm:p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><p className="text-xs font-medium text-green-800">Common App activity list</p><h2 className="mt-1 text-xl font-semibold">Common App</h2></div>
              <div className="text-right font-mono text-[11px] text-text-secondary"><p>{commonActivities}/10 activities</p><p>{commonHonors}/5 honors</p></div>
            </div>
            <p className="mb-4 rounded-lg bg-white/70 px-3 py-2 text-xs text-text-secondary">Be concise and action-first. Activity descriptions allow 150 characters; award descriptions allow 100.</p>
            <div className="space-y-3">{common.length ? common.map((entry, index) => <DraftCard key={`${entryKey(entry)}-${index}`} entry={entry} index={index} total={common.length} secondary={secondaryForEntry(entry)} onChange={(updates) => update("common_app", index, updates)} onMove={(direction) => move("common_app", index, direction)} onRemove={() => remove("common_app", index)} />) : <EmptyDiff />}</div>
          </div>
        ) : (
          <div className="mt-4 min-w-0 rounded-2xl border border-border-soft bg-[#f2f1f8] p-3 sm:p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><p className="text-xs font-medium text-violet-800">UC activity list</p><h2 className="mt-1 text-xl font-semibold">UC Activities + Awards</h2></div>
              <p className="font-mono text-[11px] text-text-secondary">{uc.length}/20 total</p>
            </div>
            <p className="mb-4 rounded-lg bg-white/70 px-3 py-2 text-xs text-text-secondary">Choose the required UC category and use up to 350 characters to add context, impact, and scope.</p>
            <div className="space-y-3">{uc.length ? uc.map((entry, index) => <DraftCard key={`${entryKey(entry)}-${index}`} entry={entry} index={index} total={uc.length} secondary={secondaryForEntry(entry)} onChange={(updates) => update("uc", index, updates)} onMove={(direction) => move("uc", index, direction)} onRemove={() => remove("uc", index)} />) : <EmptyDiff />}</div>
          </div>
        )}
      </section>
    </div>
  );
}

function ActivityEditor({
  item,
  onChange,
  onRemove,
}: {
  item: ActivityItem;
  onChange: (updates: Partial<Activity>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 border-t border-border-soft bg-white px-3 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-text-secondary">
          Position / leadership
          <input value={item.position_title} onChange={(event) => onChange({ position_title: event.target.value })} className={fieldClass} />
        </label>
        <label className="block text-xs font-medium text-text-secondary">
          Type of activity
          <select value={item.activity_type} onChange={(event) => onChange({ activity_type: event.target.value })} className={fieldClass}>
            <option value="">Select type</option>
            {ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-text-secondary sm:col-span-2">
          Organization
          <input value={item.organization} onChange={(event) => onChange({ organization: event.target.value })} className={fieldClass} />
        </label>
        <label className="block text-xs font-medium text-text-secondary sm:col-span-2">
          Description
          <textarea value={item.description} rows={3} onChange={(event) => onChange({ description: event.target.value })} className={`${fieldClass} resize-y`} />
        </label>
      </div>
      <GradeChips item={item} onChange={onChange} />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-text-secondary">
          Hours / week
          <input type="number" min="0" step="0.5" value={item.avg_hours_per_week} onChange={(event) => onChange({ avg_hours_per_week: event.target.value })} className={fieldClass} />
        </label>
        <label className="block text-xs font-medium text-text-secondary">
          Weeks / year
          <input type="number" min="0" max="52" value={item.avg_weeks_per_year} onChange={(event) => onChange({ avg_weeks_per_year: event.target.value })} className={fieldClass} />
        </label>
      </div>
      <button type="button" onClick={onRemove} className="text-xs font-medium text-red-700">Delete activity</button>
    </div>
  );
}

function HonorEditor({
  item,
  onChange,
  onRemove,
}: {
  item: HonorItem;
  onChange: (updates: Partial<Honor>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 border-t border-border-soft bg-white px-3 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-text-secondary sm:col-span-2">
          Award / honor title
          <input value={item.title} onChange={(event) => onChange({ title: event.target.value })} className={fieldClass} />
        </label>
        <label className="block text-xs font-medium text-text-secondary">
          Level of recognition
          <select value={item.recognition_level} onChange={(event) => onChange({ recognition_level: event.target.value })} className={fieldClass}>
            {RECOGNITION_LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
      </div>
      <GradeChips item={item} onChange={onChange} />
      <label className="block text-xs font-medium text-text-secondary">
        Eligibility requirements
        <textarea value={item.eligibility_requirements} rows={2} onChange={(event) => onChange({ eligibility_requirements: event.target.value })} className={`${fieldClass} resize-y`} />
      </label>
      <label className="block text-xs font-medium text-text-secondary">
        What you did to achieve it
        <textarea value={item.achievement_description} rows={3} onChange={(event) => onChange({ achievement_description: event.target.value })} className={`${fieldClass} resize-y`} />
      </label>
      <button type="button" onClick={onRemove} className="text-xs font-medium text-red-700">Delete award</button>
    </div>
  );
}

function EmptyDiff() {
  return <div className="rounded-xl border border-dashed border-border-soft bg-white/60 p-5 text-sm text-text-tertiary">Select listed activities above to begin this version.</div>;
}
