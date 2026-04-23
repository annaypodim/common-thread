"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import type { CollegeRecord, SavedCollege } from "@/lib/colleges";

type AddCollegeActionState = {
  error?: string;
  savedCollege?: SavedCollege;
};

type DashboardCollegeManagerProps = {
  colleges: CollegeRecord[];
  initialSavedColleges: SavedCollege[];
  defaultIntendedMajor: string;
  addCollegeAction: (formData: FormData) => Promise<AddCollegeActionState>;
};

function slugifyCollege(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getCollegeScore(query: string, college: CollegeRecord) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return -1;
  }

  const name = college.name.toLowerCase();
  const state = college.state.toLowerCase();
  const city = college.city.toLowerCase();
  const combined = `${name} ${city} ${state}`;

  if (name === normalizedQuery) {
    return 100;
  }

  if (name.startsWith(normalizedQuery)) {
    return 80;
  }

  if (name.includes(normalizedQuery)) {
    return 65;
  }

  const queryParts = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryParts.every((part) => combined.includes(part))) {
    return 45 - Math.max(0, name.indexOf(queryParts[0]) / 10);
  }

  let lastMatchIndex = -1;
  let sequentialMatches = 0;
  for (const character of normalizedQuery) {
    const nextIndex = combined.indexOf(character, lastMatchIndex + 1);
    if (nextIndex === -1) {
      return -1;
    }

    sequentialMatches += 1;
    lastMatchIndex = nextIndex;
  }

  return 15 + sequentialMatches / Math.max(normalizedQuery.length, 1);
}

function findBestCollegeMatch(query: string, colleges: CollegeRecord[]) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return null;
  }

  const scoredMatches = colleges
    .map((college) => ({ college, score: getCollegeScore(normalizedQuery, college) }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score || left.college.name.localeCompare(right.college.name));

  return scoredMatches[0]?.college ?? null;
}

export function DashboardCollegeManager({
  colleges,
  initialSavedColleges,
  defaultIntendedMajor,
  addCollegeAction,
}: DashboardCollegeManagerProps) {
  const [savedColleges, setSavedColleges] = useState(initialSavedColleges);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<CollegeRecord | null>(null);
  const [intendedMajor, setIntendedMajor] = useState(defaultIntendedMajor);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const suggestions = useMemo(() => {
    if (!query.trim()) {
      return colleges.slice(0, 8);
    }

    return colleges
      .map((college) => ({ college, score: getCollegeScore(query, college) }))
      .filter((item) => item.score >= 0)
      .sort((left, right) => right.score - left.score || left.college.name.localeCompare(right.college.name))
      .slice(0, 8)
      .map((item) => item.college);
  }, [colleges, query]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const resolvedCollege = selectedCollege ?? findBestCollegeMatch(query, colleges);

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

        return [...current, result.savedCollege];
      });
      setToastMessage(`${result.savedCollege.collegeName} added to your dashboard`);
      setIsModalOpen(false);
      setQuery("");
      setSelectedCollege(null);
      setIntendedMajor(defaultIntendedMajor);
    });
  };

  return (
    <>
      <header className="rounded-2xl border border-border-soft bg-white/90 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Dashboard</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">College dashboard</h2>
            <p className="mt-1 text-sm text-text-secondary">Search the full college dataset and save schools to your workspace.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light"
          >
            Add College
          </button>
        </div>
      </header>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <article className="rounded-2xl border border-border-soft bg-white p-5 xl:col-span-2">
          <h3 className="text-lg font-semibold">Active Applications</h3>
          <p className="mt-1 text-sm text-text-secondary">Tap any college to open its supplementals and research workspace.</p>
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
                className="rounded-xl border border-border-soft bg-ivory/70 p-4 transition-colors hover:bg-ivory"
              >
                <p className="font-medium text-foreground">{college.collegeName}</p>
                <p className="mt-1 text-sm text-text-secondary">{college.state || "State unavailable"}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                  {college.intendedMajor || "Intended major not added"}
                </p>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border-soft bg-white p-5">
          <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
          <p className="mt-1 text-sm text-text-secondary">Your calendar organization updates as you add colleges.</p>
          <div className="mt-4 rounded-xl border border-dashed border-border-soft bg-ivory/50 p-3 text-sm text-text-secondary">
            Deadline tracking will appear here as you build out each college workspace.
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-border-soft bg-white p-5">
          <h3 className="text-lg font-semibold">Planning Docs</h3>
          <button className="mt-4 inline-flex rounded-full border border-border-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-ivory">
            Add Doc
          </button>
        </article>

        <article className="rounded-2xl border border-border-soft bg-white p-5">
          <h3 className="text-lg font-semibold">Angle Analyzer Snapshot</h3>
          <Link
            href="/analyzer"
            className="mt-4 inline-flex rounded-full border border-border-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-ivory"
          >
            Open Angle Analyzer
          </Link>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-border-soft bg-white p-5">
        <h3 className="text-lg font-semibold">Saved Colleges</h3>
        <p className="mt-1 text-sm text-text-secondary">Cards for each school appear below your planning docs and analyzer snapshot.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {savedColleges.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-soft bg-ivory/50 p-4 text-sm text-text-secondary md:col-span-2 xl:col-span-3">
              Add your first college to see a dashboard card here.
            </div>
          )}

          {savedColleges.map((college) => (
            <article key={`${college.id}-card`} className="rounded-xl border border-border-soft bg-ivory/60 p-4">
              <p className="text-base font-semibold text-foreground">{college.collegeName}</p>
              <p className="mt-1 text-sm text-text-secondary">Located in {college.state || "an unknown state"}</p>
              <div className="mt-4 rounded-lg border border-border-soft bg-white px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">Intended Major</p>
                <p className="mt-1 text-sm text-foreground">{college.intendedMajor || "Not added yet"}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border-soft bg-white p-6 shadow-2xl">
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
                  {colleges.length === 0 && (
                    <div className="rounded-xl bg-white px-3 py-3 text-sm text-text-secondary">
                      No colleges were loaded from Supabase yet. Check that the shared `colleges` table is readable.
                    </div>
                  )}

                  {colleges.length > 0 && suggestions.length === 0 && query.trim() && (
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
                        <p className="text-sm font-medium">{college.name}</p>
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
                  <p className="font-medium text-foreground">{selectedCollege.name}</p>
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

              <div className="flex justify-end gap-3">
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
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-green-200 bg-green-100 px-4 py-3 text-sm font-medium text-green-900 shadow-lg">
          {toastMessage}
        </div>
      )}
    </>
  );
}
