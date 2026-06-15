"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CollegeDeadline } from "@/lib/deadlines";
import type { SavedCollege } from "@/lib/colleges";

export type DeadlineSuggestion = { label: string; due_date: string };

type LookupActionState = { error?: string; deadlines?: DeadlineSuggestion[] };
type SaveActionState = { error?: string; deadline?: CollegeDeadline };
type RemoveActionState = { error?: string; success?: boolean };

type UpcomingDeadlinesProps = {
  savedColleges: SavedCollege[];
  initialDeadlines: CollegeDeadline[];
  lookupDeadlinesAction: (collegeName: string) => Promise<LookupActionState>;
  saveDeadlineAction: (formData: FormData) => Promise<SaveActionState>;
  removeDeadlineAction: (formData: FormData) => Promise<RemoveActionState>;
  className?: string;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Whole days from the start of today (local) to the deadline date.
function daysUntil(isoDate: string, now: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const due = new Date(y, m - 1, d).getTime();
  const startOfToday = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()).getTime();
  return Math.round((due - startOfToday) / MS_PER_DAY);
}

function formatDueDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function countdownLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d left`;
}

function urgencyClasses(days: number) {
  if (days < 0) return "bg-gray-100 text-gray-500 border-gray-200";
  if (days <= 7) return "bg-red-50 text-red-700 border-red-200";
  if (days <= 30) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-sage/10 text-forest border-sage/25";
}

export function UpcomingDeadlines({
  savedColleges,
  initialDeadlines,
  lookupDeadlinesAction,
  saveDeadlineAction,
  removeDeadlineAction,
  className = "",
}: UpcomingDeadlinesProps) {
  const [deadlines, setDeadlines] = useState(initialDeadlines);
  const [now, setNow] = useState(() => Date.now());
  const [isManaging, setIsManaging] = useState(false);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [suggestions, setSuggestions] = useState<DeadlineSuggestion[]>([]);
  const [manualLabel, setManualLabel] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [error, setError] = useState("");
  const [isLookingUp, startLookup] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Keep the live countdown fresh across midnight without a full reload.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Derive the visible list: drop deadlines whose college was removed from the
  // dashboard (cascade handles the DB; this keeps the UI in sync), then sort.
  const sorted = useMemo(() => {
    const validIds = new Set(savedColleges.map((c) => c.id));
    return deadlines
      .filter((d) => validIds.has(d.userCollegeId))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [deadlines, savedColleges]);

  const selectedCollege = savedColleges.find((c) => c.id === selectedCollegeId) ?? null;

  function persist(userCollegeId: string, collegeName: string, label: string, dueDate: string) {
    const formData = new FormData();
    formData.set("userCollegeId", userCollegeId);
    formData.set("collegeName", collegeName);
    formData.set("label", label);
    formData.set("dueDate", dueDate);

    startSave(async () => {
      const result = await saveDeadlineAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.deadline) return;

      const saved = result.deadline;
      setDeadlines((current) => {
        const without = current.filter(
          (d) => !(d.userCollegeId === saved.userCollegeId && d.label === saved.label && d.dueDate === saved.dueDate)
        );
        return [...without, saved];
      });
      setSuggestions((current) =>
        current.filter((s) => !(s.label === saved.label && s.due_date === saved.dueDate))
      );
    });
  }

  function handleAutoFind() {
    if (!selectedCollege) return;
    setError("");
    setSuggestions([]);
    startLookup(async () => {
      const result = await lookupDeadlinesAction(selectedCollege.collegeName);
      if (result.error) {
        setError(result.error);
        return;
      }
      const found = result.deadlines ?? [];
      if (found.length === 0) {
        setError("No deadlines found automatically. Add one manually below.");
      }
      setSuggestions(found);
    });
  }

  function handleManualAdd() {
    if (!selectedCollege || !manualLabel.trim() || !manualDate) {
      setError("Pick a college, then enter a label and date.");
      return;
    }
    setError("");
    persist(selectedCollege.id, selectedCollege.collegeName, manualLabel.trim(), manualDate);
    setManualLabel("");
    setManualDate("");
  }

  function handleRemove(id: string) {
    const formData = new FormData();
    formData.set("deadlineId", id);
    setRemovingId(id);
    startSave(async () => {
      const result = await removeDeadlineAction(formData);
      if (result.error) {
        setError(result.error);
        setRemovingId(null);
        return;
      }
      setDeadlines((current) => current.filter((d) => d.id !== id));
      setRemovingId(null);
    });
  }

  return (
    <article className={`rounded-2xl border border-border-soft bg-white p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
          <p className="mt-1 text-sm text-text-secondary">Live countdown to your application dates.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsManaging((o) => !o);
            setError("");
            setSuggestions([]);
          }}
          className="shrink-0 rounded-full border border-border-soft px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-ivory"
        >
          {isManaging ? "Done" : "Manage"}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {sorted.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-soft bg-ivory/50 p-3 text-sm text-text-secondary">
            No deadlines yet. {savedColleges.length === 0 ? "Add a college first, then" : "Use"} Manage to auto-find or add dates.
          </div>
        )}

        {sorted.map((deadline) => {
          const days = daysUntil(deadline.dueDate, now);
          return (
            <div
              key={deadline.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-soft bg-ivory/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {toTitleCase(deadline.collegeName)}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {deadline.label} &middot; {formatDueDate(deadline.dueDate)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span
                  className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${urgencyClasses(days)}`}
                >
                  {countdownLabel(days)}
                </span>
                {isManaging && (
                  <button
                    type="button"
                    onClick={() => handleRemove(deadline.id)}
                    disabled={removingId === deadline.id}
                    className="rounded-full border border-border-soft px-2 py-0.5 text-xs text-text-secondary transition-colors hover:bg-white disabled:opacity-60"
                    aria-label="Remove deadline"
                  >
                    {removingId === deadline.id ? "..." : "Remove"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isManaging && (
        <div className="mt-4 space-y-3 rounded-xl border border-border-soft bg-ivory/40 p-3">
          <div>
            <label htmlFor="deadline-college" className="text-xs font-medium text-text-secondary">
              College
            </label>
            <select
              id="deadline-college"
              value={selectedCollegeId}
              onChange={(e) => {
                setSelectedCollegeId(e.target.value);
                setSuggestions([]);
                setError("");
              }}
              className="mt-1 w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-sm outline-none focus:border-forest"
            >
              <option value="">Select a saved college…</option>
              {savedColleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {toTitleCase(c.collegeName)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAutoFind}
            disabled={!selectedCollege || isLookingUp}
            className="w-full rounded-xl bg-forest px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLookingUp ? "Searching the web…" : "Auto-find deadlines"}
          </button>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">Found — tap to add:</p>
              {suggestions.map((s) => (
                <button
                  key={`${s.label}-${s.due_date}`}
                  type="button"
                  onClick={() =>
                    selectedCollege &&
                    persist(selectedCollege.id, selectedCollege.collegeName, s.label, s.due_date)
                  }
                  disabled={isSaving}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-border-soft bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-ivory disabled:opacity-60"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-text-secondary"> · {formatDueDate(s.due_date)}</span>
                  </span>
                  <span className="shrink-0 text-forest">+ Add</span>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-border-soft pt-3">
            <p className="text-xs font-medium text-text-secondary">Or add manually</p>
            <div className="mt-2 flex flex-col gap-2">
              <input
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="Label (e.g. Regular Decision)"
                className="w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-sm outline-none focus:border-forest"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-border-soft bg-white px-3 py-2 text-sm outline-none focus:border-forest"
                />
                <button
                  type="button"
                  onClick={handleManualAdd}
                  disabled={isSaving}
                  className="shrink-0 rounded-xl border border-forest px-4 py-2 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      )}
    </article>
  );
}
