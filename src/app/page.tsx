import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomBanner } from "@/components/bottom-banner";

function CheckIcon({ delay }: { delay: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="ml-1.5 inline-block h-5 w-5 align-middle sm:ml-2 sm:h-7 sm:w-7"
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="#3D6B56" strokeWidth="1.5" fill="none" opacity="0.3" />
      <path
        d="M7 12.5l3.5 3.5 6.5-7"
        stroke="#1B3A2D"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="check-mark"
        style={{ animationDelay: delay }}
      />
    </svg>
  );
}


function SchoolLogo({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-white/60 px-3 py-1.5 text-sm font-medium text-text-secondary sm:px-4 sm:py-2 sm:text-base">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-border-soft text-[9px] font-bold text-text-tertiary">
        {name[0]}
      </span>
      {name}
    </span>
  );
}

function ToolLogo({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-border-soft bg-white/50 px-3 py-1.5 text-sm font-medium text-text-secondary sm:px-4 sm:py-2 sm:text-base">
      {name}
    </span>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  // CTAs lead straight into the app; middleware lazily provisions a guest
  // session on first entry, so people can start without signing in.
  const dashboardHref = "/dashboard";
  const analyzerHref = "/analyzer";

  const primaryCtaHref = "/dashboard";
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <div className="noise-overlay" />

      {/* Hero */}
      <section className="w-full px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-up">
            <h1 className="font-serif text-[3.15rem] leading-[1.02] tracking-tight text-foreground min-[390px]:text-[3.55rem] sm:text-7xl sm:leading-[1.08] md:text-8xl">
              <span className="block">
                Application: Submitted
                <CheckIcon delay="0.6s" />
              </span>
              <span className="block mt-1">
                Counseling: Free
                <CheckIcon delay="0.8s" />
              </span>
              <span className="block mt-1">
                Written by: You
                <CheckIcon delay="1.0s" />
              </span>
            </h1>

            <p
              className="mx-auto mt-5 max-w-lg text-base leading-7 text-text-secondary animate-fade-up sm:mt-6 sm:text-xl sm:leading-relaxed"
              style={{ animationDelay: "0.4s" }}
            >
              This application strategy platform will help you find your narrative
              and organize the college planning process in one place.
            </p>

            <div
              className="mt-6 flex justify-center gap-3 animate-fade-up"
              style={{ animationDelay: "0.5s" }}
            >
              <Link
                href={primaryCtaHref}
                className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-forest px-7 py-3 text-base font-medium text-white transition-colors hover:bg-forest-light sm:w-auto sm:max-w-none sm:px-8 sm:text-lg"
              >
                Get started for free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by / Differentiator — full-width logo bar */}
      <section className="w-full border-y border-border-soft py-5 animate-fade-up sm:py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2.5 px-4 text-center sm:gap-5 sm:px-6">
          <span className="basis-full text-sm font-semibold text-foreground sm:basis-auto sm:text-base">Built by students admitted to</span>
          <SchoolLogo name="UC Berkeley" />
          <SchoolLogo name="COSMOS" />
          <span className="hidden sm:block w-px h-5 bg-border-soft" />
          <span className="basis-full pt-2 text-sm font-semibold text-foreground sm:basis-auto sm:pt-0 sm:text-base">Inspired by</span>
          <ToolLogo name="Notion" />
          <ToolLogo name="Google Docs" />
          <ToolLogo name="Grammarly" />
        </div>
      </section>

      {/* Product showcase — full-bleed cards like Notion */}
      <section className="w-full px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-7xl mx-auto">
          {/* Dashboard card — wide, interactive-feeling */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:min-h-[220px]">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground sm:text-base">Dashboard Structure</h4>
              <p className="mt-1 text-base leading-7 text-text-secondary sm:mt-2 sm:text-lg sm:leading-relaxed">
                Manage all your college and summer program applications in one place. Keep track of deadlines, essays, and research without switching between tabs. Easily revisit past responses to refine your drafts, organize &quot;Why This College&quot; insights, and stay in control, even during the most overwhelming parts of application season.
              </p>
            </div>
            <Link href={dashboardHref} className="group">
              <div className="feature-card h-full rounded-xl bg-sage p-5 sm:rounded-2xl sm:p-8">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                        <rect x="3" y="4" width="22" height="20" rx="3" stroke="#1B3A2D" strokeWidth="2" fill="none" />
                        <path d="M3 10h22M10 10v14" stroke="#1B3A2D" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <span className="text-base font-medium text-forest-muted">Dashboard</span>
                  </div>
                  <span className="text-text-tertiary group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
                <h3 className="mb-3 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
                  Your entire application,<br />organized.
                </h3>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-white/50 px-3 py-2.5 text-sm text-text-secondary sm:px-4 sm:text-base">
                    <span className="min-w-0">Stanford — Early Action</span>
                    <span className="shrink-0 text-sm text-text-tertiary">Nov 1</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-white/50 px-3 py-2.5 text-sm text-text-secondary sm:px-4 sm:text-base">
                    <span className="min-w-0">MIT — Regular Decision</span>
                    <span className="shrink-0 text-sm text-text-tertiary">Jan 5</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-lg bg-white/50 px-3 py-2.5 text-sm text-text-secondary sm:items-center sm:px-4 sm:text-base">
                    <span className="min-w-0">UC Berkeley — Essay Draft 2</span>
                    <span className="shrink-0 text-sm font-medium text-forest-muted">In progress</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Analyzer card */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:min-h-[220px]">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground sm:text-base">Narrative Analyzer</h4>
              <p className="mt-1 text-base leading-7 text-text-secondary sm:mt-2 sm:text-lg sm:leading-relaxed">
                Discover the strongest way to frame your story. Based on your activities, projects, and interests, we help you identify compelling narrative angles tailored to each college or program. Instead of guessing what to emphasize, you&apos;ll have a clear, strategic direction for your entire application.
              </p>
            </div>
            <Link href={analyzerHref} className="group">
              <div className="feature-card h-full rounded-xl bg-sage p-5 sm:rounded-2xl sm:p-8">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                        <path d="M4 8h20M4 14h14M4 20h8" stroke="#1B3A2D" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="22" cy="18" r="4" stroke="#1B3A2D" strokeWidth="1.5" fill="none" />
                      </svg>
                    </span>
                    <span className="text-base font-medium text-forest-muted">Angle Analyzer</span>
                  </div>
                  <span className="text-text-tertiary group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
                <h3 className="mb-3 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
                  Find the narrative<br />only you can tell.
                </h3>
                <div className="space-y-2 mt-4">
                  <div className="rounded-lg bg-white/50 px-3 py-2.5 text-sm text-text-secondary sm:px-4 sm:text-base">
                    <span className="text-sm font-medium text-forest-muted">Primary theme:</span> Environmental data + civic impact
                  </div>
                  <div className="rounded-lg bg-white/50 px-3 py-2.5 text-sm text-text-secondary sm:px-4 sm:text-base">
                    <span className="text-sm font-medium text-forest-muted">Evidence:</span> Air quality research, Climate blog, Internship
                  </div>
                  <div className="rounded-lg bg-white/50 px-3 py-2.5 text-sm text-text-secondary sm:px-4 sm:text-base">
                    <span className="text-sm font-medium text-forest-muted">Angle:</span> Data-driven environmental storytelling
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Value props row — compact strip */}
        <div className="max-w-7xl mx-auto mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 rounded-xl bg-forest px-5 py-4 text-white sm:rounded-2xl sm:px-6 sm:py-5">
            <p className="font-serif text-3xl leading-none sm:text-4xl">0%</p>
            <p className="text-sm text-white/60 sm:text-base">AI-written content.</p>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border-soft bg-ivory px-5 py-4 sm:rounded-2xl sm:px-6 sm:py-5">
            <p className="font-serif text-3xl leading-none text-foreground sm:text-4xl">100%</p>
            <p className="text-sm text-text-tertiary sm:text-base">Your voice, preserved. We only give feedback.</p>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border-soft bg-ivory px-5 py-4 sm:rounded-2xl sm:px-6 sm:py-5">
            <p className="font-serif text-3xl leading-none text-foreground sm:text-4xl">1</p>
            <p className="text-sm text-text-tertiary sm:text-base">Organization platform for everything.</p>
          </div>
        </div>
      </section>

      {/* CTA — full-width forest band */}
      <section className="w-full bg-forest py-12 sm:py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="font-serif text-[2.75rem] leading-[1.02] tracking-tight text-white sm:text-6xl">
            Your story is already there.
            <br />
            <span className="font-serif italic text-white/50">Let&apos;s find it.</span>
          </h2>
          <div className="mt-8">
            <Link
              href={primaryCtaHref}
              className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-forest transition-colors hover:bg-white/90 sm:w-auto sm:max-w-none sm:px-9 sm:text-lg"
            >
              Start planning for free
            </Link>
          </div>
        </div>
      </section>

      <BottomBanner />
    </div>
  );
}
