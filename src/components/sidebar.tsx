"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { saveProfileSnapshot } from "@/lib/profile-actions";
import type { UserProfileData } from "@/lib/profile";

const navItems = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "Activity Lists", href: "/activity-lists", key: "activity-lists" },
  { label: "Angle Analyzer", href: "/analyzer", key: "analyzer" },
  { label: "Personal Statement", href: "/personal-statement", key: "personal-statement" },
];

export function Sidebar({
  activePage,
  profile,
}: {
  activePage: string;
  profile: UserProfileData;
}) {
  const router = useRouter();
  const [highSchool, setHighSchool] = useState(profile.highSchool);
  const [intendedMajors, setIntendedMajors] = useState(profile.intendedMajors);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSnapshotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setSavedMessage("");

    startTransition(async () => {
      const result = await saveProfileSnapshot(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.profile) {
        setHighSchool(result.profile.highSchool);
        setIntendedMajors(result.profile.intendedMajors);
      }

      setSavedMessage("Saved");
      router.refresh();
    });
  }

  return (
    <aside className="w-full border-b border-border-soft bg-white/60 px-4 py-4 lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
      <h1 className="text-lg font-semibold text-foreground lg:mt-2 lg:text-xl">
        Application Workspace
      </h1>

      <nav className="mt-3 grid grid-cols-3 gap-2 lg:mt-8 lg:flex lg:flex-col lg:gap-1">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-sm transition-colors ${
              item.key === activePage
                ? "bg-forest text-white"
                : "text-text-secondary hover:bg-white hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-3 rounded-2xl border border-border-soft bg-white p-4 lg:mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-tertiary">
          Profile Snapshot
        </p>
        <form onSubmit={handleSnapshotSubmit} className="mt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 lg:block">
            <div className="min-w-0 text-sm text-text-secondary lg:mt-2">
              <label htmlFor="profile-snapshot-school" className="font-semibold text-foreground">
                School:
              </label>{" "}
              <input
                id="profile-snapshot-school"
                name="highSchool"
                value={highSchool}
                onChange={(event) => setHighSchool(event.target.value)}
                placeholder="Add school"
                className="mt-1 w-full rounded-lg border border-border-soft bg-white px-2 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-forest"
              />
            </div>
            <div className="min-w-0 text-sm text-text-secondary lg:mt-1">
              <label htmlFor="profile-snapshot-major" className="font-semibold text-foreground">
                Intended Major:
              </label>{" "}
              <input
                id="profile-snapshot-major"
                name="intendedMajors"
                value={intendedMajors}
                onChange={(event) => setIntendedMajors(event.target.value)}
                placeholder="Add major"
                className="mt-1 w-full rounded-lg border border-border-soft bg-white px-2 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-forest"
              />
            </div>
            <p className="min-w-0 text-sm text-text-secondary lg:mt-1">
              <span className="font-semibold text-foreground">Activities:</span>{" "}
              {profile.activities.length} listed
            </p>
            <p className="min-w-0 text-sm text-text-secondary lg:mt-1">
              <span className="font-semibold text-foreground">Awards:</span>{" "}
              {profile.honors.length} listed
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-3 w-full rounded-full bg-forest px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save Profile"}
          </button>

          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          {savedMessage && !error && <p className="mt-2 text-xs text-forest">{savedMessage}</p>}
        </form>
      </div>
    </aside>
  );
}
