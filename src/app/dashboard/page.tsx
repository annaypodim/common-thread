import { requireUser } from "@/lib/auth";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard", active: true },
  { label: "Angle Analyzer", href: "/analyzer" },
  { label: "Essays", href: "/dashboard" },
  { label: "College Research", href: "/dashboard" },
  { label: "Academic Profile", href: "/dashboard" },
  { label: "Settings", href: "/dashboard" },
];

const upcomingDeadlines = [
  { college: "Stanford", due: "Apr 26" },
  { college: "UCs Common", due: "Apr 28" },
  { college: "USC", due: "May 1" },
];

const activeApplications = [
  { college: "Stanford", status: "In progress", progress: "5/8 items" },
  { college: "UCs Common", status: "Drafting essays", progress: "3/5 items" },
  { college: "USC", status: "Researching", progress: "2/6 items" },
  { college: "Georgia Tech", status: "Ready for review", progress: "4/4 items" },
];

const savedResearch = [
  "Stanford symbols + innovation culture",
  "Berkeley EECS labs and mentorship programs",
  "USC interdisciplinary pathways for product design",
];

export default async function Dashboard() {
  const user = await requireUser();

  return (
    <div className="flex flex-1 bg-ivory text-foreground">
      <aside className="hidden w-72 shrink-0 border-r border-border-soft bg-white/60 px-5 py-6 md:block">
        <h1 className="mt-2 text-xl font-semibold text-foreground">Application Workspace</h1>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                item.active
                  ? "bg-forest text-white"
                  : "text-text-secondary hover:bg-white hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 rounded-2xl border border-border-soft bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-tertiary">Profile Snapshot</p>
          <p className="mt-2 text-sm text-text-secondary">School: Evergreen High School</p>
          <p className="mt-1 text-sm text-text-secondary">Intended major: Cognitive Science</p>
          <p className="mt-1 text-sm text-text-secondary">Activities: 0 listed</p>
          <p className="mt-1 text-sm text-text-secondary">Awards: 0 listed</p>
        </div>
      </aside>

      <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-border-soft bg-white/90 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Dashboard</p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Welcome back, {user.user_metadata?.full_name?.split(" ")[0] ?? "Student"}</h2>
            </div>
            <button className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest-light transition-colors">
              Add College
            </button>
          </div>
        </header>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <article className="rounded-2xl border border-border-soft bg-white p-5 xl:col-span-2">
            <h3 className="text-lg font-semibold">Active Applications</h3>
            <p className="mt-1 text-sm text-text-secondary">Tap any college to open its supplementals and research workspace.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {activeApplications.map((app) => (
                <Link
                  key={app.college}
                  href={`/colleges/${app.college.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-xl border border-border-soft bg-ivory/70 p-4 hover:bg-ivory transition-colors"
                >
                  <p className="font-medium text-foreground">{app.college}</p>
                  <p className="mt-1 text-sm text-text-secondary">{app.status}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">{app.progress}</p>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border-soft bg-white p-5">
            <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
            <ul className="mt-4 space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <li key={`${deadline.college}-${deadline.due}`} className="rounded-xl border border-border-soft bg-ivory/70 p-3">
                  <p className="text-sm font-medium">{deadline.college}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-forest">Due {deadline.due}</p>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-border-soft bg-white p-5">
            <h3 className="text-lg font-semibold">Planning Docs</h3>
            <ul className="mt-3 space-y-2">
              {savedResearch.map((note) => (
                <li key={note} className="rounded-lg border border-border-soft px-3 py-2 text-sm text-text-secondary bg-ivory/60">
                  {note}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-border-soft bg-white p-5">
            <h3 className="text-lg font-semibold">Angle Analyzer Snapshot</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Current theme strength: <span className="font-medium text-foreground">Builder + Community Advocate</span>
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Suggested evidence gap: Include one more academic curiosity story tied to your intended major.
            </p>
            <Link
              href="/analyzer"
              className="mt-4 inline-flex rounded-full border border-border-soft px-4 py-2 text-sm font-medium text-foreground hover:bg-ivory transition-colors"
            >
              Open Angle Analyzer
            </Link>
          </article>
        </section>
      </main>
    </div>
  );
}
