import Link from "next/link";
import type { UserProfileData } from "@/lib/profile";
import { hasAnyProfileData } from "@/lib/profile";

const navItems = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "Angle Analyzer", href: "/analyzer", key: "analyzer" },
  { label: "Essays", href: "/dashboard", key: "essays" },
  { label: "College Research", href: "/dashboard", key: "research" },
  { label: "Academic Profile", href: "/profile", key: "profile" },
  { label: "Settings", href: "/dashboard", key: "settings" },
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
    <aside className="w-64 shrink-0 border-r border-border-soft bg-white/60 px-5 py-6">
      <h1 className="mt-2 text-xl font-semibold text-foreground">
        Application Workspace
      </h1>

      <nav className="mt-8 flex flex-col gap-1">
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
        className={`mt-8 block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
          hasStartedProfile
            ? "border border-border-soft bg-white text-foreground hover:bg-ivory"
            : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
        }`}
      >
        {hasStartedProfile ? "View Full Profile Plan" : "Complete Your Profile"}
      </Link>

      <div className="mt-3 rounded-2xl border border-border-soft bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-tertiary">
          Profile Snapshot
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          School: {profile.highSchool || "Not added"}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Intended major: {profile.intendedMajors || "Not added"}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Activities: {profile.activities.length} listed
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Awards: {profile.honors.length} listed
        </p>
      </div>
    </aside>
  );
}
