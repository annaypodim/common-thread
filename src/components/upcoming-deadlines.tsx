"use client";

import { type MouseEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CollegeDeadline } from "@/lib/deadlines";
import type { SavedCollege } from "@/lib/colleges";
import type { CollegeFormStatus } from "@/lib/college-research";

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
  removeCollegeAction?: (college: SavedCollege) => void;
  removingCollegeId?: string | null;
  isRemovingCollege?: boolean;
  viewMode?: ActiveApplicationsViewMode;
  // Connection-form progress per saved-college id. Absent id = not started.
  formStatuses?: Record<string, CollegeFormStatus>;
  className?: string;
};

// Label + badge styling for each connection-form status shown in the
// spreadsheet's Status column.
const FORM_STATUS_META: Record<
  CollegeFormStatus,
  { label: string; className: string }
> = {
  not_started: {
    label: "Not started",
    className: "bg-ivory text-text-secondary hover:bg-ivory/70",
  },
  in_progress: {
    label: "In progress",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  done: {
    label: "Done",
    className: "bg-sage/20 text-forest hover:bg-sage/30",
  },
};

export type ActiveApplicationsViewMode = "cards" | "spreadsheet";

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

function slugifyCollege(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function UpcomingDeadlines({
  savedColleges,
  initialDeadlines,
  initialSuggestions = {},
  lookupDeadlinesAction,
  saveDeadlineAction,
  removeDeadlineAction,
  removeCollegeAction,
  removingCollegeId = null,
  isRemovingCollege = false,
  viewMode = "cards",
  formStatuses = {},
  className = "",
}: UpcomingDeadlinesProps) {
  const router = useRouter();
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

  function stopCardClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  const collegesWithoutAny = savedColleges.length === 0;

  if (viewMode === "spreadsheet") {
    return (
      <div className={`min-w-0 ${className}`}>
        {collegesWithoutAny ? (
          <div className="rounded-xl border border-dashed border-border-soft bg-ivory/50 p-4 text-sm text-text-secondary">
            No colleges added yet. Use the Add College button to start building your dashboard.
          </div>
        ) : (
          <div className="min-w-0 overflow-x-auto rounded-xl border border-border-soft bg-white">
            <table className="min-w-[900px] w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-ivory text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                <tr>
                  <th scope="col" className="w-28 border-b border-border-soft px-2.5 py-2">
                    Remove
                  </th>
                  <th scope="col" className="border-b border-border-soft px-2.5 py-2">
                    University
                  </th>
                  <th scope="col" className="border-b border-border-soft px-2.5 py-2">
                    Location
                  </th>
                  <th scope="col" className="border-b border-border-soft px-2.5 py-2">
                    Major
                  </th>
                  <th scope="col" className="border-b border-border-soft px-2.5 py-2">
                    Application Round
                  </th>
                  <th scope="col" className="border-b border-border-soft px-2.5 py-2">
                    Application Deadline
                  </th>
                  <th scope="col" className="border-b border-border-soft px-2.5 py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {savedColleges.map((college) => {
                  const rounds = roundsFor(college);
                  const status = lookupStatus[college.id];
                  const selectedRounds = rounds.filter((round) => round.savedId);
                  const primaryRound = selectedRounds[0] ?? rounds[0];
                  const location = [college.city && toTitleCase(college.city), college.state]
                    .filter(Boolean)
                    .join(", ");
                  const href = `/colleges/${slugifyCollege(college.collegeName)}`;
                  const formStatus = formStatuses[college.id] ?? "not_started";
                  const formStatusMeta = FORM_STATUS_META[formStatus];

                  return (
                    <tr
                      key={college.id}
                      className="border-b border-border-soft/80 last:border-b-0 hover:bg-ivory/45"
                    >
                      <td className="align-top px-2.5 py-2">
                        {removeCollegeAction && (
                          <button
                            type="button"
                            onClick={() => removeCollegeAction(college)}
                            disabled={isRemovingCollege && removingCollegeId === college.id}
                            className="rounded-full border border-border-soft bg-white px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRemovingCollege && removingCollegeId === college.id ? "Removing..." : "Remove"}
                          </button>
                        )}
                      </td>
                      <td className="max-w-64 align-top px-2.5 py-2">
                        <button
                          type="button"
                          onClick={() => router.push(href)}
                          className="break-words text-left font-semibold text-foreground hover:text-forest"
                        >
                          {toTitleCase(college.collegeName)}
                        </button>
                      </td>
                      <td className="whitespace-nowrap align-top px-2.5 py-2 text-text-secondary">
                        {location || "Location unknown"}
                      </td>
                      <td className="max-w-56 align-top px-2.5 py-2 text-text-secondary">
                        <span className="line-clamp-2">{college.intendedMajor || "—"}</span>
                      </td>
                      <td className="min-w-56 align-top px-2.5 py-2">
                        {rounds.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {rounds.map((round) => {
                              const key = `${college.id}|${round.label}|${round.dueDate}`;
                              const selected = round.savedId !== null;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleRound(college, round)}
                                  disabled={busyKey === key}
                                  title={selected ? "Selected - tap to remove" : "Tap to select this round"}
                                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                    selected
                                      ? "border-forest bg-forest text-white hover:bg-forest-light"
                                      : "border-border-soft bg-white text-text-secondary hover:border-forest hover:text-forest"
                                  }`}
                                >
                                  {selected ? round.label : `+ ${round.label}`}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-text-tertiary">
                            {status === "loading" ? "Finding rounds..." : "No rounds selected"}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap align-top px-2.5 py-2 font-medium text-foreground">
                        {primaryRound ? (
                          primaryRound.sourceUrl ? (
                            <a
                              href={primaryRound.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Verify on the official admissions site"
                              className="text-forest underline underline-offset-2 hover:text-forest-light"
                            >
                              {formatDueDate(primaryRound.dueDate)}
                            </a>
                          ) : (
                            formatDueDate(primaryRound.dueDate)
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap align-top px-2.5 py-2">
                        {/* Connection-form progress — links to the form itself. */}
                        <button
                          type="button"
                          onClick={() => router.push(href)}
                          title="Open this college's connection form"
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold underline-offset-2 transition-colors hover:underline ${formStatusMeta.className}`}
                        >
                          {formStatusMeta.label}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
        {collegesWithoutAny && (
          <div className="rounded-xl border border-dashed border-border-soft bg-ivory/50 p-4 text-sm text-text-secondary md:col-span-2 xl:col-span-3">
            No colleges added yet. Use the Add College button to start building your dashboard.
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
          const location = [college.city && toTitleCase(college.city), college.state]
            .filter(Boolean)
            .join(", ");
          const href = `/colleges/${slugifyCollege(college.collegeName)}`;

          return (
            <article
              key={college.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(href)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(href);
                }
              }}
              className="flex min-w-0 cursor-pointer flex-col rounded-xl border border-border-soft bg-ivory/60 p-4 transition-colors hover:border-forest/40 hover:bg-ivory"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="min-w-0 break-words text-base font-semibold text-foreground">
                    {toTitleCase(college.collegeName)}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {location || "Location unknown"}
                  </p>
                </div>
                {removeCollegeAction && (
                  <button
                    type="button"
                    onClick={(event) => {
                      stopCardClick(event);
                      removeCollegeAction(college);
                    }}
                    disabled={isRemovingCollege && removingCollegeId === college.id}
                    className="shrink-0 rounded-full border border-border-soft bg-white/70 px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRemovingCollege && removingCollegeId === college.id ? "Removing..." : "Remove"}
                  </button>
                )}
              </div>

              <p className="mt-3 text-sm text-text-secondary">
                Major <span className="text-foreground">{college.intendedMajor || "—"}</span>
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                    Application deadline
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
                              onClick={stopCardClick}
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
                            onClick={(event) => {
                              stopCardClick(event);
                              toggleRound(college, round);
                            }}
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
                              onClick={stopCardClick}
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
                  onClick={(event) => {
                    stopCardClick(event);
                    toggleExpand(college);
                  }}
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
                      onClick={(event) => {
                        stopCardClick(event);
                        fetchSuggestions(college);
                      }}
                      className="font-medium text-forest underline underline-offset-2 hover:text-forest-light"
                    >
                      Retry
                    </button>
                  </p>
                )}
              </div>
            </article>
          );
        })}

      {error && <p className="text-xs text-red-700 md:col-span-2 xl:col-span-3">{error}</p>}
    </div>
  );
}
