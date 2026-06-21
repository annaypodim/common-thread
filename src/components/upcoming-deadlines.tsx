"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { CollegeDeadline } from "@/lib/deadlines";
import type { SavedCollege } from "@/lib/colleges";

export type DeadlineSuggestion = {
  label: string;
  due_date: string;
  source_url: string;
};

type LookupActionState = { error?: string; deadlines?: DeadlineSuggestion[] };
type SaveActionState = { error?: string; deadline?: CollegeDeadline };
type RemoveActionState = { error?: string; success?: boolean };

type UpcomingDeadlinesProps = {
  savedColleges: SavedCollege[];
  initialDeadlines: CollegeDeadline[];
  // Cached rounds per college id, seeded server-side so known colleges render
  // instantly without a client-side web search.
  initialSuggestions?: Record<string, DeadlineSuggestion[]>;
  lookupDeadlinesAction: (collegeName: string) => Promise<LookupActionState>;
  saveDeadlineAction: (formData: FormData) => Promise<SaveActionState>;
  removeDeadlineAction: (formData: FormData) => Promise<RemoveActionState>;
  className?: string;
};

// A round shown under a college: a suggested or saved application deadline.
// `savedId` is set when the student has selected this round (it's persisted).
type Round = {
  label: string;
  dueDate: string;
  sourceUrl: string;
  savedId: string | null;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Whole days from the start of today (local) to the deadline date.
function daysUntil(isoDate: string, now: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const due = new Date(y, m - 1, d).getTime();
  const startOfToday = new Date(
    new Date(now).getFullYear(),
    new Date(now).getMonth(),
    new Date(now).getDate(),
  ).getTime();
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

export function UpcomingDeadlines({
  savedColleges,
  initialDeadlines,
  initialSuggestions = {},
  lookupDeadlinesAction,
  saveDeadlineAction,
  removeDeadlineAction,
  className = "",
}: UpcomingDeadlinesProps) {
  const [deadlines, setDeadlines] = useState(initialDeadlines);
  // Auto-found rounds per college id (undefined = not looked up yet). Seeded
  // from the server-side cache so already-known colleges don't re-search.
  const [suggestions, setSuggestions] =
    useState<Record<string, DeadlineSuggestion[]>>(initialSuggestions);
  const [lookupStatus, setLookupStatus] = useState<
    Record<string, "loading" | "error">
  >({});
  const [now, setNow] = useState(() => Date.now());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Per-college: whether the unselected rounds are expanded (they collapse once
  // a round is picked).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  // Dedupe in-flight lookups so we don't fire the same web search twice.
  const inFlight = useRef<Set<string>>(new Set());

  // Keep the live countdown fresh across midnight without a full reload.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  function fetchSuggestions(college: SavedCollege) {
    if (inFlight.current.has(college.id)) return;
    inFlight.current.add(college.id);
    startTransition(async () => {
      setLookupStatus((s) => ({ ...s, [college.id]: "loading" }));
      const result = await lookupDeadlinesAction(college.collegeName);
      inFlight.current.delete(college.id);
      if (result.error) {
        setLookupStatus((s) => ({ ...s, [college.id]: "error" }));
        return;
      }
      setSuggestions((cur) => ({
        ...cur,
        [college.id]: result.deadlines ?? [],
      }));
      setLookupStatus((s) => {
        const next = { ...s };
        delete next[college.id];
        return next;
      });
    });
  }

  // Auto-search deadlines for any college that doesn't have a round selected
  // yet — so dates pop up on their own as soon as a college is added. Once the
  // student picks a round (a saved deadline exists) we stop searching it. An
  // errored lookup waits for a manual retry instead of looping.
  useEffect(() => {
    for (const college of savedColleges) {
      const hasSaved = deadlines.some((d) => d.userCollegeId === college.id);
      const hasSuggestions = suggestions[college.id] !== undefined;
      const errored = lookupStatus[college.id] === "error";
      if (
        !hasSaved &&
        !hasSuggestions &&
        !errored &&
        !inFlight.current.has(college.id)
      ) {
        fetchSuggestions(college);
      }
    }
    // fetchSuggestions is stable enough for this effect's purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedColleges, deadlines, suggestions, lookupStatus]);

  // Merge a college's auto-found rounds with any it has already selected.
  function roundsFor(college: SavedCollege): Round[] {
    const map = new Map<string, Round>();
    for (const s of suggestions[college.id] ?? []) {
      map.set(`${s.label}|${s.due_date}`, {
        label: s.label,
        dueDate: s.due_date,
        sourceUrl: s.source_url,
        savedId: null,
      });
    }
    for (const d of deadlines.filter((x) => x.userCollegeId === college.id)) {
      const key = `${d.label}|${d.dueDate}`;
      const existing = map.get(key);
      if (existing) existing.savedId = d.id;
      else
        map.set(key, {
          label: d.label,
          dueDate: d.dueDate,
          sourceUrl: d.sourceUrl,
          savedId: d.id,
        });
    }
    return [...map.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  // One click: select a round (save it) or unselect it (remove it).
  function toggleRound(college: SavedCollege, round: Round) {
    const key = `${college.id}|${round.label}|${round.dueDate}`;
    setError("");
    setBusyKey(key);

    if (round.savedId) {
      const formData = new FormData();
      formData.set("deadlineId", round.savedId);
      startTransition(async () => {
        const result = await removeDeadlineAction(formData);
        setBusyKey(null);
        if (result.error) {
          setError(result.error);
          return;
        }
        setDeadlines((cur) => cur.filter((d) => d.id !== round.savedId));
      });
      return;
    }

    const formData = new FormData();
    formData.set("userCollegeId", college.id);
    formData.set("collegeName", college.collegeName);
    formData.set("label", round.label);
    formData.set("dueDate", round.dueDate);
    formData.set("sourceUrl", round.sourceUrl);
    startTransition(async () => {
      const result = await saveDeadlineAction(formData);
      setBusyKey(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.deadline) return;
      const saved = result.deadline;
      setDeadlines((cur) => {
        const without = cur.filter(
          (d) =>
            !(
              d.userCollegeId === saved.userCollegeId &&
              d.label === saved.label &&
              d.dueDate === saved.dueDate
            ),
        );
        return [...without, saved];
      });
    });
  }

  // Show/hide the other rounds for a decided college, fetching them on first
  // expand if they haven't been looked up yet.
  function toggleExpand(college: SavedCollege) {
    const willExpand = !expanded[college.id];
    setExpanded((e) => ({ ...e, [college.id]: willExpand }));
    if (willExpand && suggestions[college.id] === undefined) {
      fetchSuggestions(college);
    }
  }

  const collegesWithoutAny = savedColleges.length === 0;

  return (
    <article
      className={`min-w-0 rounded-2xl border border-border-soft bg-white p-4 sm:p-5 ${className}`}
    >
      <div>
        <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Pick the round you&rsquo;re applying to. Tap again to change your
          mind.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {collegesWithoutAny && (
          <div className="rounded-xl border border-dashed border-border-soft bg-ivory/50 p-3 text-sm text-text-secondary">
            Add a college and its deadlines will show up here automatically.
          </div>
        )}

        {savedColleges.map((college) => {
          const rounds = roundsFor(college);
          const status = lookupStatus[college.id];
          const lookedUp = suggestions[college.id] !== undefined;
          const hasSelection = rounds.some((r) => r.savedId);
          const isExpanded = !!expanded[college.id];

          // Once a round is picked, collapse the rest behind a toggle.
          const visibleRounds =
            hasSelection && !isExpanded
              ? rounds.filter((r) => r.savedId)
              : rounds;
          const otherCount = rounds.filter((r) => !r.savedId).length;
          // Offer the toggle whenever there could be alternatives to show.
          const canToggleOthers = hasSelection && (!lookedUp || otherCount > 0);

          const collapsedDecided = hasSelection && !isExpanded;

          return (
            <div
              key={college.id}
              className="border-b border-border-soft pb-4 last:border-b-0 last:pb-0"
            >
              {/* Header: college name, plus the chosen round(s) when collapsed */}
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {toTitleCase(college.collegeName)}
                  {collapsedDecided &&
                    visibleRounds.map((r) => (
                      <span
                        key={r.label}
                        className="ml-2 rounded-full bg-sage/15 px-2 py-0.5 text-xs font-medium text-forest"
                      >
                        {r.label}
                      </span>
                    ))}
                </p>
                {status === "loading" && (
                  <span className="shrink-0 text-xs text-text-tertiary">
                    Finding deadlines…
                  </span>
                )}
              </div>

              {collapsedDecided ? (
                /* Decided + collapsed: lead with the bold date */
                <div className="mt-2 space-y-1.5">
                  {visibleRounds.map((round) => {
                    const days = daysUntil(round.dueDate, now);
                    return (
                      <div
                        key={`${college.id}|${round.label}|${round.dueDate}`}
                        className="flex items-center justify-between gap-2 rounded-xl bg-forest px-3 py-2 text-white"
                      >
                        <span className="flex items-center gap-2 text-sm font-bold">
                          {formatDueDate(round.dueDate)}
                          {round.sourceUrl && (
                            <a
                              href={round.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Verify on the official admissions site"
                              className="text-sm font-normal text-white/70 hover:text-white"
                            >
                              ↗
                            </a>
                          )}
                        </span>
                        <span className="whitespace-nowrap rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                          {countdownLabel(days)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Undecided or expanded: the round picker */
                visibleRounds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {visibleRounds.map((round) => {
                      const key = `${college.id}|${round.label}|${round.dueDate}`;
                      const selected = round.savedId !== null;
                      const days = daysUntil(round.dueDate, now);
                      return (
                        <div key={key} className="flex min-w-0 w-full items-center sm:inline-flex sm:w-auto">
                          <button
                            type="button"
                            onClick={() => toggleRound(college, round)}
                            disabled={busyKey === key}
                            title={
                              selected
                                ? "Selected — tap to remove"
                                : "Tap to select this round"
                            }
                            className={`flex min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded-2xl border px-3 py-2 text-left text-xs font-medium transition-colors disabled:opacity-50 sm:inline-flex sm:flex-none sm:rounded-full sm:py-1.5 ${
                              selected
                                ? "border-forest bg-forest text-white hover:bg-forest-light"
                                : "border-border-soft bg-white text-text-secondary hover:border-forest hover:text-forest"
                            }`}
                          >
                            {!selected && (
                              <span aria-hidden className="text-text-tertiary">
                                +
                              </span>
                            )}
                            <span>{round.label}</span>
                            <span
                              className={
                                selected
                                  ? "font-bold text-white"
                                  : "text-text-tertiary"
                              }
                            >
                              {formatDueDate(round.dueDate)}
                            </span>
                            {selected && (
                              <span className="ml-0.5 whitespace-nowrap rounded-full border border-white/40 bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                {countdownLabel(days)}
                              </span>
                            )}
                          </button>
                          {round.sourceUrl && (
                            <a
                              href={round.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Verify on the official admissions site"
                              className="ml-1 text-xs text-text-tertiary hover:text-forest"
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Toggle the other rounds for a decided college */}
              {canToggleOthers && (
                <button
                  type="button"
                  onClick={() => toggleExpand(college)}
                  className="mt-2 text-xs font-medium text-forest underline underline-offset-2 hover:text-forest-light"
                >
                  {isExpanded ? "Hide other rounds ▴" : "Show other rounds ▾"}
                </button>
              )}

              {/* Undecided college that's about to / currently searching */}
              {!lookedUp &&
                !hasSelection &&
                status !== "error" &&
                rounds.length === 0 && (
                  <p className="mt-1 text-xs text-text-tertiary">
                    Finding deadlines…
                  </p>
                )}

              {/* Nothing found, or the search failed */}
              {!hasSelection &&
                ((lookedUp && rounds.length === 0) || status === "error") && (
                  <p className="mt-1 text-xs text-text-tertiary">
                    {status === "error"
                      ? "Search failed."
                      : "No deadlines found automatically."}{" "}
                    <button
                      type="button"
                      onClick={() => fetchSuggestions(college)}
                      className="font-medium text-forest underline underline-offset-2 hover:text-forest-light"
                    >
                      Retry
                    </button>
                  </p>
                )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
    </article>
  );
}
