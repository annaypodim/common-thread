"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import type { CollegeRecord, SavedCollege } from "@/lib/colleges";
import type { NarrativeAngle } from "@/app/api/analyze/route";

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
  defaultIntendedMajor: string;
  topAngle: NarrativeAngle | null;
  searchCollegeOptions: (query: string) => Promise<SearchCollegeActionState>;
  addCollegeAction: (formData: FormData) => Promise<AddCollegeActionState>;
  removeCollegeAction: (formData: FormData) => Promise<RemoveCollegeActionState>;
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
  defaultIntendedMajor,
  topAngle,
  searchCollegeOptions,
  addCollegeAction,
  removeCollegeAction,
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
      <section className="mt-4 grid gap-5 xl:grid-cols-3">
        <article className="rounded-2xl border border-border-soft bg-white p-5 xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Applications</h3>
              <p className="mt-1 text-sm text-text-secondary">Tap any college to open its supplementals and research workspace.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light"
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

        <article className="rounded-2xl border border-border-soft bg-white p-5">
          <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
          <p className="mt-1 text-sm text-text-secondary">Your calendar organization updates as you add colleges.</p>
          <div className="mt-4 rounded-xl border border-dashed border-border-soft bg-ivory/50 p-3 text-sm text-text-secondary">
            Deadline tracking will appear here as you build out each college workspace.
          </div>
        </article>
      </section>

      <section className="mt-5">
        <article className="rounded-2xl border border-border-soft bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold">Angle Analyzer Snapshot</h3>
            {topAngle && (
              <span className="shrink-0 rounded-full bg-background px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Strongest Angle
              </span>
            )}
          </div>

          {topAngle ? (
            <>
              <h4 className="mt-3 font-serif text-xl font-semibold text-foreground">
                {topAngle.title}
              </h4>
              {topAngle.major_connection && (
                <div className="mt-2 inline-flex items-center rounded-full border border-sage/25 bg-sage/10 px-3 py-1">
                  <span className="text-sm font-semibold text-forest">
                    {topAngle.major_connection}
                  </span>
                </div>
              )}
              {topAngle.standout_reason && (
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {topAngle.standout_reason}
                </p>
              )}
              <Link
                href="/analyzer"
                className="mt-4 inline-flex rounded-full border border-border-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-ivory"
              >
                View full analysis
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-text-secondary">Haven&apos;t found your angle yet.</p>
              <Link
                href="/analyzer"
                className="mt-4 inline-flex rounded-full border border-border-soft px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-ivory"
              >
                Open Angle Analyzer
              </Link>
            </>
          )}
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-border-soft bg-white p-5">
        <h3 className="text-lg font-semibold">Saved Colleges</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {savedColleges.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-soft bg-ivory/50 p-4 text-sm text-text-secondary md:col-span-2 xl:col-span-3">
              Add your first college to see a dashboard card here.
            </div>
          )}

          {savedColleges.map((college) => (
            <article key={`${college.id}-card`} className="flex flex-col rounded-xl border border-border-soft bg-ivory/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-semibold text-foreground">{toTitleCase(college.collegeName)}</p>
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
