"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Activity, Honor } from "@/lib/profile";

type ProfileFormProps = {
  initialHighSchool: string;
  initialMajors: string;
  initialActivities: Activity[];
  initialHonors: Honor[];
  saveAction: (formData: FormData) => Promise<void>;
  autosaveAction: (formData: FormData) => Promise<void>;
  deleteActivityAction: (activityId: string) => Promise<void>;
  deleteHonorAction: (honorId: string) => Promise<void>;
};

type SectionId = "activities" | "honors";

const defaultActivity: Activity = {
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
};

const defaultHonor: Honor = {
  title: "",
  grade_9: false,
  grade_10: false,
  grade_11: false,
  grade_12: false,
  recognition_level: "School",
  eligibility_requirements: "",
  achievement_description: "",
};

function createLocalKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function updateItem<T>(items: T[], index: number, updates: Partial<T>) {
  const next = [...items];
  next[index] = { ...next[index], ...updates };
  return next;
}

function gradesLabel(item: Pick<Activity | Honor, "grade_9" | "grade_10" | "grade_11" | "grade_12">) {
  const grades = [
    item.grade_9 ? "9" : "",
    item.grade_10 ? "10" : "",
    item.grade_11 ? "11" : "",
    item.grade_12 ? "12" : "",
  ].filter(Boolean);

  return grades.length > 0 ? `Grades ${grades.join(", ")}` : "No grades selected";
}

function SectionHeader({
  id,
  title,
  detail,
  isOpen,
  onToggle,
}: {
  id: SectionId;
  title: string;
  detail: string;
  isOpen: boolean;
  onToggle: (id: SectionId) => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={`${id}-section`}
      className="flex w-full items-center justify-between gap-4 text-left"
      onClick={() => onToggle(id)}
    >
      <span>
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-text-tertiary">{detail}</span>
      </span>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-soft bg-ivory text-foreground">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-soft bg-white text-foreground transition-colors hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-35"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function MoveUpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4v12M5.5 8.5 10 4l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoveDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 16V4m4.5 7.5L10 16l-4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function activityTitle(activity: Activity, index: number) {
  return activity.position_title || activity.organization || activity.activity_type || `Activity ${index + 1}`;
}

function honorTitle(honor: Honor, index: number) {
  return honor.title || `Honor / Award ${index + 1}`;
}

function hasSavableActivity(activity: Activity) {
  return Boolean(activity.activity_type || activity.position_title || activity.organization || activity.description);
}

function hasSavableHonor(honor: Honor) {
  return Boolean(
    honor.title ||
      honor.grade_9 ||
      honor.grade_10 ||
      honor.grade_11 ||
      honor.grade_12 ||
      honor.eligibility_requirements ||
      honor.achievement_description
  );
}

export function ProfileForm({
  initialHighSchool,
  initialMajors,
  initialActivities,
  initialHonors,
  saveAction,
  autosaveAction,
  deleteActivityAction,
  deleteHonorAction,
}: ProfileFormProps) {
  const initialActivityItems = useMemo(
    () => (initialActivities.length > 0 ? initialActivities : [{ ...defaultActivity }]),
    [initialActivities]
  );
  const initialHonorItems = useMemo(() => (initialHonors.length > 0 ? initialHonors : [{ ...defaultHonor }]), [initialHonors]);
  const initialActivityKeys = useMemo(
    () => initialActivityItems.map((activity, index) => activity.id ?? `activity-initial-${index}`),
    [initialActivityItems]
  );
  const initialHonorKeys = useMemo(() => initialHonorItems.map((honor, index) => honor.id ?? `honor-initial-${index}`), [initialHonorItems]);

  const [activities, setActivities] = useState<Activity[]>(initialActivityItems);
  const [honors, setHonors] = useState<Honor[]>(initialHonorItems);
  const [activityKeys, setActivityKeys] = useState<string[]>(initialActivityKeys);
  const [honorKeys, setHonorKeys] = useState<string[]>(initialHonorKeys);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    activities: true,
    honors: false,
  });
  const [openActivityKeys, setOpenActivityKeys] = useState<Set<string>>(() => new Set(initialActivityKeys.slice(0, 1)));
  const [openHonorKeys, setOpenHonorKeys] = useState<Set<string>>(() => new Set(initialHonorKeys.slice(0, 1)));
  const [savedActivityKeys, setSavedActivityKeys] = useState<Set<string>>(
    () => new Set(initialActivityItems.map((activity, index) => (activity.id ? initialActivityKeys[index] : "")).filter(Boolean))
  );
  const [savedHonorKeys, setSavedHonorKeys] = useState<Set<string>>(
    () => new Set(initialHonorItems.map((honor, index) => (honor.id ? initialHonorKeys[index] : "")).filter(Boolean))
  );
  const formRef = useRef<HTMLFormElement>(null);
  const activitiesRef = useRef<Activity[]>(initialActivityItems);
  const honorsRef = useRef<Honor[]>(initialHonorItems);
  const activityKeysRef = useRef<string[]>(initialActivityKeys);
  const honorKeysRef = useRef<string[]>(initialHonorKeys);
  const hasUnsavedChangesRef = useRef(false);
  const dirtyVersionRef = useRef(0);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushAutosave = useCallback(async () => {
    if (!hasUnsavedChangesRef.current || !formRef.current) {
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    const savedVersion = dirtyVersionRef.current;
    const formData = new FormData(formRef.current);
    formData.set("activities", JSON.stringify(activitiesRef.current));
    formData.set("honors", JSON.stringify(honorsRef.current));

    await autosaveAction(formData);

    if (dirtyVersionRef.current === savedVersion) {
      hasUnsavedChangesRef.current = false;
      setSavedActivityKeys(
        new Set(activityKeysRef.current.filter((key, index) => hasSavableActivity(activitiesRef.current[index])))
      );
      setSavedHonorKeys(new Set(honorKeysRef.current.filter((key, index) => hasSavableHonor(honorsRef.current[index]))));
    }
  }, [autosaveAction]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      void flushAutosave();
    }, 900);
  }, [flushAutosave]);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  useEffect(() => {
    honorsRef.current = honors;
  }, [honors]);

  useEffect(() => {
    activityKeysRef.current = activityKeys;
  }, [activityKeys]);

  useEffect(() => {
    honorKeysRef.current = honorKeys;
  }, [honorKeys]);

  useEffect(() => {
    function confirmBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChangesRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", confirmBeforeUnload);
    return () => window.removeEventListener("beforeunload", confirmBeforeUnload);
  }, []);

  useEffect(() => {
    function saveBeforeNavigation(event: MouseEvent) {
      if (
        !hasUnsavedChangesRef.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute("download")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      void flushAutosave()
        .then(() => {
          window.location.assign(link.href);
        })
        .catch(() => {
          hasUnsavedChangesRef.current = true;
        });
    }

    document.addEventListener("click", saveBeforeNavigation, true);
    return () => document.removeEventListener("click", saveBeforeNavigation, true);
  }, [flushAutosave]);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  function setUnsavedChanges(hasChanges: boolean, shouldAutosave = true) {
    hasUnsavedChangesRef.current = hasChanges;
    if (hasChanges) {
      dirtyVersionRef.current += 1;

      if (shouldAutosave) {
        scheduleAutosave();
      }
    } else if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
  }

  function updateActivities(updater: (prev: Activity[]) => Activity[]) {
    setActivities((prev) => {
      const next = updater(prev);
      activitiesRef.current = next;
      return next;
    });
  }

  function updateHonors(updater: (prev: Honor[]) => Honor[]) {
    setHonors((prev) => {
      const next = updater(prev);
      honorsRef.current = next;
      return next;
    });
  }

  function markActivityUnsaved(key: string) {
    setSavedActivityKeys((prev) => {
      if (!prev.has(key)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function markHonorUnsaved(key: string) {
    setSavedHonorKeys((prev) => {
      if (!prev.has(key)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function toggleSection(id: SectionId) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleActivity(key: string) {
    setOpenActivityKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleHonor(key: string) {
    setOpenHonorKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function addActivity() {
    await flushAutosave();

    const key = createLocalKey("activity");
    updateActivities((prev) => [...prev, { ...defaultActivity }]);
    setActivityKeys((prev) => [...prev, key]);
    setOpenSections((prev) => ({ ...prev, activities: true }));
    setOpenActivityKeys((prev) => new Set(prev).add(key));
  }

  async function addHonor() {
    await flushAutosave();

    const key = createLocalKey("honor");
    updateHonors((prev) => [...prev, { ...defaultHonor }]);
    setHonorKeys((prev) => [...prev, key]);
    setOpenSections((prev) => ({ ...prev, honors: true }));
    setOpenHonorKeys((prev) => new Set(prev).add(key));
  }

  function removeActivity(index: number) {
    setUnsavedChanges(true);
    updateActivities((prev) => {
      if (prev.length === 1) {
        return [{ ...defaultActivity }];
      }

      return prev.filter((_, idx) => idx !== index);
    });
    setActivityKeys((prev) => {
      if (prev.length === 1) {
        const key = createLocalKey("activity");
        setOpenActivityKeys(new Set([key]));
        return [key];
      }

      const removedKey = prev[index];
      setOpenActivityKeys((openKeys) => {
        const next = new Set(openKeys);
        next.delete(removedKey);
        return next;
      });
      return prev.filter((_, idx) => idx !== index);
    });
    setSavedActivityKeys((prev) => {
      const removedKey = activityKeys[index];
      if (!prev.has(removedKey)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(removedKey);
      return next;
    });
  }

  function removeHonor(index: number) {
    setUnsavedChanges(true);
    updateHonors((prev) => {
      if (prev.length === 1) {
        return [{ ...defaultHonor }];
      }

      return prev.filter((_, idx) => idx !== index);
    });
    setHonorKeys((prev) => {
      if (prev.length === 1) {
        const key = createLocalKey("honor");
        setOpenHonorKeys(new Set([key]));
        return [key];
      }

      const removedKey = prev[index];
      setOpenHonorKeys((openKeys) => {
        const next = new Set(openKeys);
        next.delete(removedKey);
        return next;
      });
      return prev.filter((_, idx) => idx !== index);
    });
    setSavedHonorKeys((prev) => {
      const removedKey = honorKeys[index];
      if (!prev.has(removedKey)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(removedKey);
      return next;
    });
  }

  return (
    <form
      ref={formRef}
      action={saveAction}
      className="space-y-6"
      onChange={() => setUnsavedChanges(true)}
      onSubmit={() => setUnsavedChanges(false)}
    >
      <section className="rounded-2xl border border-border-soft bg-white p-5">
        <h2 className="text-lg font-semibold">School Info</h2>
        <p className="mt-2 text-sm text-text-tertiary">
          <span className="font-medium text-red-500">*</span> Required for a complete profile. You can save a draft and finish later.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-text-secondary">
            High School <span className="text-red-500">*</span>
            <input
              name="highSchool"
              defaultValue={initialHighSchool}
              className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-foreground"
              placeholder="Evergreen High School"
            />
          </label>
          <label className="text-sm text-text-secondary">
            Potential Major(s) <span className="text-red-500">*</span>
            <input
              name="intendedMajors"
              defaultValue={initialMajors}
              className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-foreground"
              placeholder="Computer Science, Cognitive Science"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border-soft bg-white p-5">
        <SectionHeader
          id="activities"
          title="Activities / Extracurriculars"
          detail={`${activities.length} listed. Activities, service, work, leadership, and clubs.`}
          isOpen={openSections.activities}
          onToggle={toggleSection}
        />
        <input type="hidden" name="activities" value={JSON.stringify(activities)} />
        {openSections.activities ? (
          <div id="activities-section" className="mt-4 space-y-4">
            {activities.map((activity, index) => {
              const key = activityKeys[index];
              const isOpen = openActivityKeys.has(key);
              const isSaved = savedActivityKeys.has(key);

              return (
                <article key={key} className="relative rounded-xl border border-border-soft bg-white" onChange={() => markActivityUnsaved(key)}>
                  <span
                    className={`absolute -left-3 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full ${
                      isSaved ? "bg-green-600 text-white" : "bg-yellow-300 text-yellow-900"
                    }`}
                  >
                    {isSaved ? (
                      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                        <path
                          d="M4.5 10.5L8 14l7.5-8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
                    )}
                  </span>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <button type="button" className="min-w-0 text-left" aria-expanded={isOpen} onClick={() => toggleActivity(key)}>
                      <span className="block text-sm font-semibold text-foreground">{activityTitle(activity, index)}</span>
                      <span className="mt-1 block text-xs text-text-tertiary">
                        #{index + 1} importance ranking. {activity.organization || activity.activity_type || "Details not added."}
                      </span>
                      <span className="mt-2 line-clamp-2 block text-sm text-text-secondary">
                        {activity.description || "No activity description yet."}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <IconButton
                        label="Move activity up"
                        disabled={index === 0}
                        onClick={() => {
                          setUnsavedChanges(true);
                          updateActivities((prev) => moveItem(prev, index, index - 1));
                          setActivityKeys((prev) => moveItem(prev, index, index - 1));
                        }}
                      >
                        <MoveUpIcon />
                      </IconButton>
                      <IconButton
                        label="Move activity down"
                        disabled={index === activities.length - 1}
                        onClick={() => {
                          setUnsavedChanges(true);
                          updateActivities((prev) => moveItem(prev, index, index + 1));
                          setActivityKeys((prev) => moveItem(prev, index, index + 1));
                        }}
                      >
                        <MoveDownIcon />
                      </IconButton>
                      <IconButton label={isOpen ? "Collapse activity" : "Expand activity"} onClick={() => toggleActivity(key)}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        >
                          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </IconButton>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="border-t border-border-soft p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm text-text-secondary">
                          Type of activity
                          <select
                            value={activity.activity_type}
                            onChange={(event) => updateActivities((prev) => updateItem(prev, index, { activity_type: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                          >
                            <option value="">Select type</option>
                            <option value="Educational Preparation Program">Educational Preparation Program</option>
                            <option value="Extracurricular Activity">Extracurricular Activity</option>
                            <option value="Other Coursework">Other Coursework</option>
                            <option value="Volunteer/Community Service">Volunteer/Community Service</option>
                            <option value="Work Experience">Work Experience</option>
                          </select>
                        </label>
                        <label className="text-sm text-text-secondary">
                          Position / Title / Leadership
                          <input
                            value={activity.position_title}
                            onChange={(event) => updateActivities((prev) => updateItem(prev, index, { position_title: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                          />
                        </label>
                        <label className="text-sm text-text-secondary md:col-span-2">
                          Organization affiliated with activity
                          <input
                            value={activity.organization}
                            onChange={(event) => updateActivities((prev) => updateItem(prev, index, { organization: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                          />
                        </label>
                        <label className="text-sm text-text-secondary md:col-span-2">
                          Activity description
                          <textarea
                            value={activity.description}
                            onChange={(event) => updateActivities((prev) => updateItem(prev, index, { description: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                            rows={3}
                          />
                        </label>
                        <fieldset className="text-sm text-text-secondary md:col-span-2">
                          <legend>Years of participation</legend>
                          <div className="mt-2 flex flex-wrap gap-4">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={activity.grade_9}
                                onChange={(event) => updateActivities((prev) => updateItem(prev, index, { grade_9: event.target.checked }))}
                              />
                              9th grade
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={activity.grade_10}
                                onChange={(event) => updateActivities((prev) => updateItem(prev, index, { grade_10: event.target.checked }))}
                              />
                              10th grade
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={activity.grade_11}
                                onChange={(event) => updateActivities((prev) => updateItem(prev, index, { grade_11: event.target.checked }))}
                              />
                              11th grade
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={activity.grade_12}
                                onChange={(event) => updateActivities((prev) => updateItem(prev, index, { grade_12: event.target.checked }))}
                              />
                              12th grade
                            </label>
                          </div>
                        </fieldset>
                        <label className="text-sm text-text-secondary">
                          Avg hours per week
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={activity.avg_hours_per_week}
                            onChange={(event) => updateActivities((prev) => updateItem(prev, index, { avg_hours_per_week: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                          />
                        </label>
                        <label className="text-sm text-text-secondary">
                          Avg weeks per year
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={activity.avg_weeks_per_year}
                            onChange={(event) => updateActivities((prev) => updateItem(prev, index, { avg_weeks_per_year: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="mt-3 text-sm text-red-600"
                        onClick={async () => {
                          if (activity.id) {
                            await deleteActivityAction(activity.id);
                          }

                          removeActivity(index);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
            <button type="button" className="w-full rounded-full border border-border-soft px-4 py-2 text-sm font-medium" onClick={addActivity}>
              Add Activity
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border-soft bg-white p-5">
        <SectionHeader
          id="honors"
          title="Honors / Awards"
          detail={`${honors.length} listed. Recognition, distinctions, competitions, and awards.`}
          isOpen={openSections.honors}
          onToggle={toggleSection}
        />
        <input type="hidden" name="honors" value={JSON.stringify(honors)} />
        {openSections.honors ? (
          <div id="honors-section" className="mt-4 space-y-4">
            {honors.map((honor, index) => {
              const key = honorKeys[index];
              const isOpen = openHonorKeys.has(key);
              const isSaved = savedHonorKeys.has(key);

              return (
                <article key={key} className="relative rounded-xl border border-border-soft bg-white" onChange={() => markHonorUnsaved(key)}>
                  <span
                    className={`absolute -left-3 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full ${
                      isSaved ? "bg-green-600 text-white" : "bg-yellow-300 text-yellow-900"
                    }`}
                  >
                    {isSaved ? (
                      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                        <path
                          d="M4.5 10.5L8 14l7.5-8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
                    )}
                  </span>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <button type="button" className="min-w-0 text-left" aria-expanded={isOpen} onClick={() => toggleHonor(key)}>
                      <span className="block text-sm font-semibold text-foreground">{honorTitle(honor, index)}</span>
                      <span className="mt-1 block text-xs text-text-tertiary">
                        #{index + 1} importance ranking. {honor.recognition_level || "Recognition level not set"}.
                      </span>
                      <span className="mt-2 block text-sm text-text-secondary">{gradesLabel(honor)}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <IconButton
                        label="Move honor up"
                        disabled={index === 0}
                        onClick={() => {
                          setUnsavedChanges(true);
                          updateHonors((prev) => moveItem(prev, index, index - 1));
                          setHonorKeys((prev) => moveItem(prev, index, index - 1));
                        }}
                      >
                        <MoveUpIcon />
                      </IconButton>
                      <IconButton
                        label="Move honor down"
                        disabled={index === honors.length - 1}
                        onClick={() => {
                          setUnsavedChanges(true);
                          updateHonors((prev) => moveItem(prev, index, index + 1));
                          setHonorKeys((prev) => moveItem(prev, index, index + 1));
                        }}
                      >
                        <MoveDownIcon />
                      </IconButton>
                      <IconButton label={isOpen ? "Collapse honor" : "Expand honor"} onClick={() => toggleHonor(key)}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        >
                          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </IconButton>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="border-t border-border-soft p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm text-text-secondary md:col-span-2">
                          Honors/Award title
                          <input
                            value={honor.title}
                            onChange={(event) => updateHonors((prev) => updateItem(prev, index, { title: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                          />
                        </label>
                        <fieldset className="text-sm text-text-secondary">
                          <legend>Grade-level when received</legend>
                          <div className="mt-2 flex flex-wrap gap-4">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={honor.grade_9}
                                onChange={(event) => updateHonors((prev) => updateItem(prev, index, { grade_9: event.target.checked }))}
                              />
                              9th grade
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={honor.grade_10}
                                onChange={(event) => updateHonors((prev) => updateItem(prev, index, { grade_10: event.target.checked }))}
                              />
                              10th grade
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={honor.grade_11}
                                onChange={(event) => updateHonors((prev) => updateItem(prev, index, { grade_11: event.target.checked }))}
                              />
                              11th grade
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={honor.grade_12}
                                onChange={(event) => updateHonors((prev) => updateItem(prev, index, { grade_12: event.target.checked }))}
                              />
                              12th grade
                            </label>
                          </div>
                        </fieldset>
                        <label className="text-sm text-text-secondary">
                          Level of recognition
                          <select
                            value={honor.recognition_level}
                            onChange={(event) => updateHonors((prev) => updateItem(prev, index, { recognition_level: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                          >
                            <option value="School">School</option>
                            <option value="State">State</option>
                            <option value="National">National</option>
                            <option value="International">International</option>
                          </select>
                        </label>
                        <label className="text-sm text-text-secondary md:col-span-2">
                          What are the eligibility requirements for this award/honor?
                          <textarea
                            value={honor.eligibility_requirements}
                            onChange={(event) =>
                              updateHonors((prev) => updateItem(prev, index, { eligibility_requirements: event.target.value }))
                            }
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                            rows={3}
                          />
                        </label>
                        <label className="text-sm text-text-secondary md:col-span-2">
                          What did you do to achieve this award/honor?
                          <textarea
                            value={honor.achievement_description}
                            onChange={(event) =>
                              updateHonors((prev) => updateItem(prev, index, { achievement_description: event.target.value }))
                            }
                            className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                            rows={3}
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="mt-3 text-sm text-red-600"
                        onClick={async () => {
                          if (honor.id) {
                            await deleteHonorAction(honor.id);
                          }

                          removeHonor(index);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
            <button type="button" className="w-full rounded-full border border-border-soft px-4 py-2 text-sm font-medium" onClick={addHonor}>
              Add Honor/Award
            </button>
          </div>
        ) : null}
      </section>

    </form>
  );
}
