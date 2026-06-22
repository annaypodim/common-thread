"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import type { CollegeRecord, SavedCollege } from "@/lib/colleges";
import type { AnalyzeResult } from "@/app/api/analyze/route";
import { DashboardAngleAnalyzer } from "@/components/dashboard-angle-analyzer";
import { PersonalStatementCard } from "@/components/personal-statement-card";
import type { PersonalStatementDraft } from "@/lib/personal-statement-types";
import type { CollegeDeadline } from "@/lib/deadlines";
import {
  UpcomingDeadlines,
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

function slugifyCollege(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DashboardCollegeManager({
  initialCollegeSuggestions,
  initialSavedColleges,
  initialDeadlines,
  initialDeadlineSuggestions,
  defaultIntendedMajor,
  savedAnalysis,
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
  const [selectedCollege, setSelectedCollege] = useState<CollegeRecord | null>(null);
  const [intendedMajor, setIntendedMajor] = useState(defaultIntendedMajor);
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const resolvedCollege = selectedCollege;

    if (!resolvedCollege) {
      setErrorMessage("No matching college found. Try a more specific search.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("name", resolvedCollege.name);
    formData.set("address", resolvedCollege.address ?? "");
    formData.set("city", resolvedCollege.city ?? "");
    formData.set("state", resolvedCollege.state ?? "");
    formData.set("zip", resolvedCollege.zip ?? "");
    formData.set("website", resolvedCollege.website ?? "");
    setErrorMessage("");

    startTransition(async () => {
      const result = await addCollegeAction(formData);

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      if (!result.savedCollege) {
        return;
      }

      setSelectedCollege(resolvedCollege);
      setSavedColleges((current) => {
        if (current.some((college) => college.id === result.savedCollege?.id)) {
          return current;
        }

        return [...current, result.savedCollege!];
      });
      setToastMessage(`${result.savedCollege.collegeName} added to your dashboard`);
      setIsModalOpen(false);
      setQuery("");
      setSelectedCollege(null);
      setIntendedMajor(defaultIntendedMajor);
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
      <section className="grid min-w-0 gap-4 sm:mt-4 sm:gap-5 xl:grid-cols-5">
        <article className="min-w-0 rounded-2xl border border-border-soft bg-white p-4 sm:p-5 xl:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Applications</h3>
              <p className="mt-1 text-sm text-text-secondary">Tap any college to open its supplementals and research workspace.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full rounded-full bg-forest px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-forest-light sm:w-auto sm:py-2"
            >
              Add College
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {savedColleges.length === 0 && (
              <div className="rounded-xl border border-dashed border-border-soft bg-ivory/50 p-4 text-sm text-text-secondary sm:col-span-2">
                No colleges added yet. Use the Add College button to start building your dashboard.
              </div>
            )}

            {savedColleges.map((college) => (
              <Link
                key={college.id}
                href={`/colleges/${slugifyCollege(college.collegeName)}`}
                className="flex min-h-[3rem] flex-col justify-center rounded-lg border border-border-soft bg-ivory/70 px-3 py-2 transition-colors hover:bg-ivory"
              >
                <p className="text-sm font-medium text-foreground">{toTitleCase(college.collegeName)}</p>
              </Link>
            ))}
          </div>
        </article>

        <UpcomingDeadlines
          className="xl:col-span-2"
          savedColleges={savedColleges}
          initialDeadlines={initialDeadlines}
          initialSuggestions={initialDeadlineSuggestions}
          lookupDeadlinesAction={lookupDeadlinesAction}
          saveDeadlineAction={saveDeadlineAction}
          removeDeadlineAction={removeDeadlineAction}
        />
      </section>

      <section className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
        <DashboardAngleAnalyzer savedResult={savedAnalysis} />
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

      <section className="mt-4 rounded-2xl border border-border-soft bg-white p-4 sm:mt-5 sm:p-5">
        <h3 className="text-lg font-semibold">Saved Colleges</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {savedColleges.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-soft bg-ivory/50 p-4 text-sm text-text-secondary md:col-span-2 xl:col-span-3">
              Add your first college to see a dashboard card here.
            </div>
          )}

          {savedColleges.map((college) => (
            <article key={`${college.id}-card`} className="flex min-w-0 flex-col rounded-xl border border-border-soft bg-ivory/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words text-base font-semibold text-foreground">{toTitleCase(college.collegeName)}</p>
                <button
                  type="button"
                  onClick={() => handleRemoveCollege(college)}
                  disabled={isPending && removingCollegeId === college.id}
                  className="rounded-full border border-border-soft px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending && removingCollegeId === college.id ? "Removing..." : "Remove"}
                </button>
              </div>
              <p className="mt-1 text-sm text-text-secondary">{[college.city && toTitleCase(college.city), college.state].filter(Boolean).join(", ") || "Location unknown"}</p>
              <p className="mt-auto pt-3 text-sm text-text-secondary">
                Major — <span className="text-foreground">{college.intendedMajor || "—"}</span>
              </p>
            </article>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-black/35 px-3 py-3 sm:items-center sm:px-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border-soft bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Add College</h3>
                <p className="mt-1 text-sm text-text-secondary">Search the full college list and save a school to your dashboard.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
                    setSelectedCollege(null);
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
                    const isSelected = selectedCollege?.name === college.name && selectedCollege?.state === college.state;

                    return (
                      <button
                        key={`${college.name}-${college.state}-${college.city}`}
                        type="button"
                        onClick={() => {
                          setSelectedCollege(college);
                          setQuery(college.name);
                        }}
                        className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                          isSelected ? "bg-forest text-white" : "bg-white text-foreground hover:bg-ivory"
                        }`}
                      >
                        <p className="text-sm font-medium">{toTitleCase(college.name)}</p>
                        <p className={`mt-1 text-xs ${isSelected ? "text-white/80" : "text-text-secondary"}`}>
                          {college.city}, {college.state}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="intended-major" className="text-sm font-medium text-foreground">
                  Intended major
                </label>
                <input
                  id="intended-major"
                  value={intendedMajor}
                  onChange={(event) => setIntendedMajor(event.target.value)}
                  placeholder="Example: Computer Science"
                  className="mt-2 w-full rounded-2xl border border-border-soft px-4 py-3 text-sm outline-none transition-colors focus:border-forest"
                />
              </div>

              {selectedCollege && (
                <div className="rounded-2xl border border-border-soft bg-ivory/60 px-4 py-3 text-sm text-text-secondary">
                  <p className="font-medium text-foreground">{toTitleCase(selectedCollege.name)}</p>
                  <p className="mt-1">{selectedCollege.city}, {selectedCollege.state}</p>
                </div>
              )}

              {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}

              <input type="hidden" name="name" value={selectedCollege?.name ?? ""} />
              <input type="hidden" name="address" value={selectedCollege?.address ?? ""} />
              <input type="hidden" name="city" value={selectedCollege?.city ?? ""} />
              <input type="hidden" name="state" value={selectedCollege?.state ?? ""} />
              <input type="hidden" name="zip" value={selectedCollege?.zip ?? ""} />
              <input type="hidden" name="website" value={selectedCollege?.website ?? ""} />
              <input type="hidden" name="intendedMajor" value={intendedMajor} />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-border-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedCollege || isPending}
                  className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Adding..." : "Add to Dashboard"}
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
