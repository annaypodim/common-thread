import Link from "next/link";
import type { UserProfileData } from "@/lib/profile";
import { hasAnyProfileData } from "@/lib/profile";

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
  const hasStartedProfile = hasAnyProfileData(profile);

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

      <Link
        href="/profile"
        className={`mt-3 block rounded-xl px-4 py-3 text-sm font-medium transition-colors lg:mt-8 ${
          hasStartedProfile
            ? "border border-border-soft bg-white text-foreground hover:bg-ivory"
            : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
        }`}
      >
        View Full Profile Plan
      </Link>

      <div className="mt-3 rounded-2xl border border-border-soft bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-tertiary">
          Profile Snapshot
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 lg:block">
          <p className="min-w-0 text-sm text-text-secondary lg:mt-2">
            <span className="font-semibold text-foreground">School:</span>{" "}
            <span className="break-words">{profile.highSchool || "Not added"}</span>
          </p>
          <p className="min-w-0 text-sm text-text-secondary lg:mt-1">
            <span className="font-semibold text-foreground">Intended Major:</span>{" "}
            <span className="break-words">{profile.intendedMajors || "Not added"}</span>
          </p>
          <p className="min-w-0 text-sm text-text-secondary lg:mt-1">
            <span className="font-semibold text-foreground">Activities:</span>{" "}
            {profile.activities.length} listed
          </p>
          <p className="min-w-0 text-sm text-text-secondary lg:mt-1">
            <span className="font-semibold text-foreground">Awards:</span>{" "}
            {profile.honors.length} listed
          </p>
        </div>
      </div>
    </aside>
  );
}
