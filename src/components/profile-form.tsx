"use client";

import { useState } from "react";
import type { Activity, Honor } from "@/lib/profile";

type ProfileFormProps = {
  initialHighSchool: string;
  initialMajors: string;
  initialActivities: Activity[];
  initialHonors: Honor[];
  saveAction: (formData: FormData) => Promise<void>;
  deleteActivityAction: (activityId: string) => Promise<void>;
  deleteHonorAction: (honorId: string) => Promise<void>;
};

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

export function ProfileForm({
  initialHighSchool,
  initialMajors,
  initialActivities,
  initialHonors,
  saveAction,
  deleteActivityAction,
  deleteHonorAction,
}: ProfileFormProps) {
  const [activities, setActivities] = useState<Activity[]>(
    initialActivities.length > 0 ? initialActivities : [defaultActivity]
  );
  const [honors, setHonors] = useState<Honor[]>(initialHonors.length > 0 ? initialHonors : [defaultHonor]);

  return (
    <form action={saveAction} className="space-y-8">
      <section className="rounded-2xl border border-border-soft bg-white p-5">
        <h2 className="text-lg font-semibold">Profile Basics</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-text-secondary">
            High School
            <input
              name="highSchool"
              defaultValue={initialHighSchool}
              className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-foreground"
              placeholder="Evergreen High School"
              required
            />
          </label>
          <label className="text-sm text-text-secondary">
            Potential Major(s)
            <input
              name="intendedMajors"
              defaultValue={initialMajors}
              className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-foreground"
              placeholder="Computer Science, Cognitive Science"
              required
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border-soft bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Activities / Extracurriculars</h2>
          <button
            type="button"
            className="rounded-full border border-border-soft px-3 py-1 text-sm"
            onClick={() => setActivities((prev) => [...prev, defaultActivity])}
          >
            Add Activity
          </button>
        </div>
        <input type="hidden" name="activities" value={JSON.stringify(activities)} />
        <div className="mt-4 space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id ?? index} className="relative rounded-xl border border-border-soft p-4">
              <span
                className={`absolute -left-3 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full ${
                  activity.id ? "bg-green-600 text-white" : "bg-yellow-300 text-yellow-900"
                }`}
              >
                {activity.id ? (
                  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M4.5 10.5L8 14l7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
                )}
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Type of activity
                  <select
                    value={activity.activity_type}
                    onChange={(event) => {
                      const next = [...activities];
                      next[index] = { ...next[index], activity_type: event.target.value };
                      setActivities(next);
                    }}
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
                    onChange={(event) => {
                      const next = [...activities];
                      next[index] = { ...next[index], position_title: event.target.value };
                      setActivities(next);
                    }}
                    className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                  />
                </label>
                <label className="text-sm text-text-secondary md:col-span-2">
                  Organization affiliated with activity
                  <input
                    value={activity.organization}
                    onChange={(event) => {
                      const next = [...activities];
                      next[index] = { ...next[index], organization: event.target.value };
                      setActivities(next);
                    }}
                    className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                  />
                </label>
                <label className="text-sm text-text-secondary md:col-span-2">
                  Activity description
                  <textarea
                    value={activity.description}
                    onChange={(event) => {
                      const next = [...activities];
                      next[index] = { ...next[index], description: event.target.value };
                      setActivities(next);
                    }}
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
                        onChange={(event) => {
                          const next = [...activities];
                          next[index] = { ...next[index], grade_9: event.target.checked };
                          setActivities(next);
                        }}
                      />
                      9th grade
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activity.grade_10}
                        onChange={(event) => {
                          const next = [...activities];
                          next[index] = { ...next[index], grade_10: event.target.checked };
                          setActivities(next);
                        }}
                      />
                      10th grade
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activity.grade_11}
                        onChange={(event) => {
                          const next = [...activities];
                          next[index] = { ...next[index], grade_11: event.target.checked };
                          setActivities(next);
                        }}
                      />
                      11th grade
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activity.grade_12}
                        onChange={(event) => {
                          const next = [...activities];
                          next[index] = { ...next[index], grade_12: event.target.checked };
                          setActivities(next);
                        }}
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
                    onChange={(event) => {
                      const next = [...activities];
                      next[index] = { ...next[index], avg_hours_per_week: event.target.value };
                      setActivities(next);
                    }}
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
                    onChange={(event) => {
                      const next = [...activities];
                      next[index] = { ...next[index], avg_weeks_per_year: event.target.value };
                      setActivities(next);
                    }}
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

                  setActivities((prev) => {
                    if (prev.length === 1) {
                      return [{ ...defaultActivity }];
                    }

                    return prev.filter((_, idx) => idx !== index);
                  });
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border-soft bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Honors / Awards</h2>
          <button
            type="button"
            className="rounded-full border border-border-soft px-3 py-1 text-sm"
            onClick={() => setHonors((prev) => [...prev, defaultHonor])}
          >
            Add Honor/Award
          </button>
        </div>
        <input type="hidden" name="honors" value={JSON.stringify(honors)} />
        <div className="mt-4 space-y-4">
          {honors.map((honor, index) => (
            <div key={honor.id ?? index} className="relative rounded-xl border border-border-soft p-4">
              <span
                className={`absolute -left-3 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full ${
                  honor.id ? "bg-green-600 text-white" : "bg-yellow-300 text-yellow-900"
                }`}
              >
                {honor.id ? (
                  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M4.5 10.5L8 14l7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
                )}
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary md:col-span-2">
                  Honors/Award title
                  <input
                    value={honor.title}
                    onChange={(event) => {
                      const next = [...honors];
                      next[index] = { ...next[index], title: event.target.value };
                      setHonors(next);
                    }}
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
                        onChange={(event) => {
                          const next = [...honors];
                          next[index] = { ...next[index], grade_9: event.target.checked };
                          setHonors(next);
                        }}
                      />
                      9th grade
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={honor.grade_10}
                        onChange={(event) => {
                          const next = [...honors];
                          next[index] = { ...next[index], grade_10: event.target.checked };
                          setHonors(next);
                        }}
                      />
                      10th grade
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={honor.grade_11}
                        onChange={(event) => {
                          const next = [...honors];
                          next[index] = { ...next[index], grade_11: event.target.checked };
                          setHonors(next);
                        }}
                      />
                      11th grade
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={honor.grade_12}
                        onChange={(event) => {
                          const next = [...honors];
                          next[index] = { ...next[index], grade_12: event.target.checked };
                          setHonors(next);
                        }}
                      />
                      12th grade
                    </label>
                  </div>
                </fieldset>
                <label className="text-sm text-text-secondary">
                  Level of recognition
                  <select
                    value={honor.recognition_level}
                    onChange={(event) => {
                      const next = [...honors];
                      next[index] = { ...next[index], recognition_level: event.target.value };
                      setHonors(next);
                    }}
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
                    onChange={(event) => {
                      const next = [...honors];
                      next[index] = { ...next[index], eligibility_requirements: event.target.value };
                      setHonors(next);
                    }}
                    className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2"
                    rows={3}
                  />
                </label>
                <label className="text-sm text-text-secondary md:col-span-2">
                  What did you do to achieve this award/honor?
                  <textarea
                    value={honor.achievement_description}
                    onChange={(event) => {
                      const next = [...honors];
                      next[index] = { ...next[index], achievement_description: event.target.value };
                      setHonors(next);
                    }}
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

                  setHonors((prev) => {
                    if (prev.length === 1) {
                      return [{ ...defaultHonor }];
                    }

                    return prev.filter((_, idx) => idx !== index);
                  });
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        className="rounded-full bg-forest px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light"
      >
        Save Profile
      </button>
    </form>
  );
}
