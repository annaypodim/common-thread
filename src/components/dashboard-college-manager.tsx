"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import type { CollegeRecord, SavedCollege } from "@/lib/colleges";
import { slugifyCollege } from "@/lib/college-format";
import type { AnalyzeResult } from "@/app/api/analyze/route";
import { DashboardAngleAnalyzer } from "@/components/dashboard-angle-analyzer";
import { PersonalStatementCard } from "@/components/personal-statement-card";
import type { PersonalStatementDraft } from "@/lib/personal-statement-types";
import type { CollegeDeadline } from "@/lib/deadlines";
import {
  UpcomingDeadlines,
  type ActiveApplicationsViewMode,
  type DeadlineSuggestion,
} from "@/components/upcoming-deadlines";

type AddCollegeActionState = {
  error?: string;
  savedCollege?: SavedCollege;
};

type RemoveCollegeActionState = {
  error?: string;
  success?: boolean;
};

type SearchCollegeActionState = {
  error?: string;
  colleges?: CollegeRecord[];
};

type DashboardCollegeManagerProps = {
  initialCollegeSuggestions: CollegeRecord[];
  initialSavedColleges: SavedCollege[];
  initialDeadlines: CollegeDeadline[];
  initialDeadlineSuggestions: Record<string, DeadlineSuggestion[]>;
  defaultIntendedMajor: string;
  savedAnalysis: AnalyzeResult | null;
  analysisRunsRemaining: number;
  analysisRunsLimit: number;
  isSignedIn: boolean;
  personalStatementDraft: PersonalStatementDraft;
  searchCollegeOptions: (query: string) => Promise<SearchCollegeActionState>;
  addCollegeAction: (formData: FormData) => Promise<AddCollegeActionState>;
  removeCollegeAction: (formData: FormData) => Promise<RemoveCollegeActionState>;
  lookupDeadlinesAction: (
    collegeName: string
  ) => Promise<{ error?: string; deadlines?: DeadlineSuggestion[] }>;
  saveDeadlineAction: (
    formData: FormData
  ) => Promise<{ error?: string; deadline?: CollegeDeadline }>;
  removeDeadlineAction: (
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

type QueuedCollege = {
  college: CollegeRecord;
  major: string;
};

function collegeKey(college: CollegeRecord) {
  return `${college.name}-${college.state}-${college.city}`;
}

export function DashboardCollegeManager({
  initialCollegeSuggestions,
  initialSavedColleges,
  initialDeadlines,
  initialDeadlineSuggestions,
  defaultIntendedMajor,
  savedAnalysis,
  analysisRunsRemaining,
  analysisRunsLimit,
  isSignedIn,
  personalStatementDraft,
  searchCollegeOptions,
  addCollegeAction,
  removeCollegeAction,
  lookupDeadlinesAction,
  saveDeadlineAction,
  removeDeadlineAction,
}: DashboardCollegeManagerProps) {
  const [savedColleges, setSavedColleges] = useState(initialSavedColleges);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(initialCollegeSuggestions);
  const [queuedColleges, setQueuedColleges] = useState<QueuedCollege[]>([]);
  const [activeApplicationsView, setActiveApplicationsView] =
    useState<ActiveApplicationsViewMode>("cards");
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [removingCollegeId, setRemovingCollegeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    let isCurrentSearch = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      const result = await searchCollegeOptions(query);

      if (!isCurrentSearch) {
        return;
      }

      if (result.error) {
        setErrorMessage(result.error);
        setSuggestions([]);
      } else {
        setSuggestions(result.colleges ?? []);
      }

      setIsSearching(false);
    }, 200);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(timeoutId);
    };
  }, [isModalOpen, query, searchCollegeOptions]);

  const closeModal = () => {
    setIsModalOpen(false);
    setQuery("");
    setQueuedColleges([]);
    setErrorMessage("");
  };

  const toggleQueuedCollege = (college: CollegeRecord) => {
    setErrorMessage("");
    setQueuedColleges((current) => {
      if (current.some((queued) => collegeKey(queued.college) === collegeKey(college))) {
        return current.filter((queued) => collegeKey(queued.college) !== collegeKey(college));
      }

      return [...current, { college, major: defaultIntendedMajor }];
    });
  };

  const updateQueuedMajor = (college: CollegeRecord, major: string) => {
    setQueuedColleges((current) =>
      current.map((queued) =>
        collegeKey(queued.college) === collegeKey(college) ? { ...queued, major } : queued
      )
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (queuedColleges.length === 0) {
      setErrorMessage("Search and click at least one college to add.");
      return;
    }

    setErrorMessage("");

    startTransition(async () => {
      const added: SavedCollege[] = [];
      const succeededKeys = new Set<string>();
      let failure = "";

      for (const { college, major } of queuedColleges) {
        const formData = new FormData();
        formData.set("name", college.name);
        formData.set("address", college.address ?? "");
        formData.set("city", college.city ?? "");
        formData.set("state", college.state ?? "");
        formData.set("zip", college.zip ?? "");
        formData.set("website", college.website ?? "");
        formData.set("intendedMajor", major);

        const result = await addCollegeAction(formData);

        if (result.error) {
          failure = result.error;
          break;
        }

        if (result.savedCollege) {
          added.push(result.savedCollege);
          succeededKeys.add(collegeKey(college));
        }
      }

      if (added.length > 0) {
        setSavedColleges((current) => {
          const merged = [...current];
          for (const savedCollege of added) {
            if (!merged.some((college) => college.id === savedCollege.id)) {
              merged.push(savedCollege);
            }
          }
          return merged;
        });
      }

      if (failure) {
        setErrorMessage(failure);
        setQueuedColleges((current) =>
          current.filter((queued) => !succeededKeys.has(collegeKey(queued.college)))
        );
        if (added.length > 0) {
          setToastMessage(
            added.length === 1
              ? `${added[0].collegeName} added to your dashboard`
              : `${added.length} colleges added to your dashboard`
          );
        }
        return;
      }

      setToastMessage(
        added.length === 1
          ? `${added[0].collegeName} added to your dashboard`
          : `${added.length} colleges added to your dashboard`
      );
      closeModal();
    });
  };

  const handleRemoveCollege = (savedCollege: SavedCollege) => {
    const formData = new FormData();
    formData.set("savedCollegeId", savedCollege.id);
    setErrorMessage("");
    setRemovingCollegeId(savedCollege.id);

    startTransition(async () => {
      const result = await removeCollegeAction(formData);

      if (result.error) {
        setErrorMessage(typeof result.error === "string" ? result.error : "Unable to remove college right now.");
        setRemovingCollegeId(null);
        return;
      }

      setSavedColleges((current) => current.filter((college) => college.id !== savedCollege.id));
      setToastMessage(`${savedCollege.collegeName} removed from your dashboard`);
      setRemovingCollegeId(null);
    });
  };

  return (
    <>
      <section className="min-w-0 sm:mt-4">
        <article className="flex min-w-0 flex-col rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Applications</h3>
              <p className="mt-1 text-sm text-text-secondary">Tap any college to open its supplementals and research workspace.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className="grid grid-cols-2 rounded-full border border-border-soft bg-ivory/80 p-1"
                aria-label="Active applications view"
              >
                {(["cards", "spreadsheet"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveApplicationsView(view)}
                    aria-pressed={activeApplicationsView === view}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeApplicationsView === view
                        ? "bg-white text-forest shadow-sm"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                  >
                    {view === "cards" ? "Cards" : "Spreadsheet"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-forest-light sm:w-auto sm:py-2"
              >
                Add College
              </button>
            </div>
          </div>

          <UpcomingDeadlines
            className="mt-4 max-h-[22rem] min-h-0 overflow-y-auto pr-1"
            viewMode={activeApplicationsView}
            savedColleges={savedColleges}
            initialDeadlines={initialDeadlines}
            initialSuggestions={initialDeadlineSuggestions}
            lookupDeadlinesAction={lookupDeadlinesAction}
            saveDeadlineAction={saveDeadlineAction}
            removeDeadlineAction={removeDeadlineAction}
            removeCollegeAction={handleRemoveCollege}
            removingCollegeId={removingCollegeId}
            isRemovingCollege={isPending}
          />
        </article>
      </section>

      <section className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
        <DashboardAngleAnalyzer
          savedResult={savedAnalysis}
          runsRemaining={analysisRunsRemaining}
          runsLimit={analysisRunsLimit}
          isSignedIn={isSignedIn}
        />
        <PersonalStatementCard draft={personalStatementDraft} />
      </section>

      <section className="mt-5 rounded-2xl border border-border-soft bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-forest-muted">Application materials</p>
            <h3 className="mt-1 text-lg font-semibold">Common App + UC Activity Lists</h3>
            <p className="mt-1 text-sm text-text-secondary">Turn raw profile experiences into ordered, platform-specific drafts with the correct limits.</p>
          </div>
          <Link href="/activity-lists" className="shrink-0 rounded-full bg-forest px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-forest-light">Open Activity Lists</Link>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-black/35 px-3 py-3 sm:items-center sm:px-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border-soft bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Add Colleges</h3>
                <p className="mt-1 text-sm text-text-secondary">Search and click colleges to queue them, set each intended major, then add them all at once.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-border-soft px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-ivory"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="college-search" className="text-sm font-medium text-foreground">
                  College name
                </label>
                <input
                  id="college-search"
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="Start typing a university or college name"
                  className="mt-2 w-full rounded-2xl border border-border-soft px-4 py-3 text-sm outline-none transition-colors focus:border-forest"
                />
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-border-soft bg-ivory/40 p-2">
                  {isSearching && (
                    <div className="rounded-xl bg-white px-3 py-3 text-sm text-text-secondary">
                      Searching colleges...
                    </div>
                  )}

                  {!isSearching && suggestions.length === 0 && !query.trim() && (
                    <div className="rounded-xl bg-white px-3 py-3 text-sm text-text-secondary">
                      No colleges were loaded from Supabase yet. Check that the shared `colleges` table is readable.
                    </div>
                  )}

                  {!isSearching && suggestions.length === 0 && query.trim() && (
                    <div className="rounded-xl bg-white px-3 py-3 text-sm text-text-secondary">
                      No colleges match “{query}”. Try a shorter or broader search.
                    </div>
                  )}

                  {suggestions.map((college) => {
                    const isQueued = queuedColleges.some(
                      (queued) => collegeKey(queued.college) === collegeKey(college)
                    );

                    return (
                      <button
                        key={collegeKey(college)}
                        type="button"
                        onClick={() => toggleQueuedCollege(college)}
                        className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                          isQueued ? "bg-forest text-white" : "bg-white text-foreground hover:bg-ivory"
                        }`}
                      >
                        <p className="text-sm font-medium">{toTitleCase(college.name)}</p>
                        <p className={`mt-1 text-xs ${isQueued ? "text-white/80" : "text-text-secondary"}`}>
                          {college.city}, {college.state}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {queuedColleges.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Colleges to add ({queuedColleges.length})
                  </p>
                  {queuedColleges.map(({ college, major }) => (
                    <div
                      key={collegeKey(college)}
                      className="rounded-2xl border border-border-soft bg-ivory/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{toTitleCase(college.name)}</p>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {college.city}, {college.state}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleQueuedCollege(college)}
                          className="shrink-0 rounded-full border border-border-soft px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-white"
                        >
                          Remove
                        </button>
                      </div>
                      <label className="mt-2 block">
                        <span className="text-xs font-medium text-text-secondary">Intended major</span>
                        <input
                          value={major}
                          onChange={(event) => updateQueuedMajor(college, event.target.value)}
                          placeholder="Example: Computer Science"
                          className="mt-1 w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-forest"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-border-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={queuedColleges.length === 0 || isPending}
                  className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending
                    ? "Adding..."
                    : queuedColleges.length > 1
                      ? `Add ${queuedColleges.length} to Dashboard`
                      : "Add to Dashboard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed right-4 bottom-4 left-4 z-50 rounded-2xl border border-green-200 bg-green-100 px-4 py-3 text-center text-sm font-medium text-green-900 shadow-lg sm:right-6 sm:bottom-6 sm:left-auto sm:text-left">
          {toastMessage}
        </div>
      )}
    </>
  );
}
