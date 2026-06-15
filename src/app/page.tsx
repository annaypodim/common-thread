import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomBanner } from "@/components/bottom-banner";

function CheckIcon({ delay }: { delay: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      className="inline-block ml-2 -mt-1"
      style={{ animationDelay: delay }}
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
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-border-soft text-base font-medium text-text-secondary">
      <span className="w-5 h-5 rounded-full bg-border-soft flex items-center justify-center text-[9px] font-bold text-text-tertiary">
        {name[0]}
      </span>
      {name}
    </span>
  );
}

function ToolLogo({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 border border-border-soft text-base font-medium text-text-secondary">
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

  const dashboardHref = "/sign-in";
  const analyzerHref = "/sign-in";

  const primaryCtaHref = "/sign-in";
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <div className="noise-overlay" />

      {/* Hero */}
      <section className="w-full px-4 sm:px-6 pt-12 sm:pt-20 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-up">
            <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl leading-[1.08] tracking-tight text-foreground">
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
              className="mt-6 mx-auto max-w-lg text-xl leading-relaxed text-text-secondary animate-fade-up"
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
                className="rounded-full bg-forest text-white px-8 py-3 text-lg font-medium hover:bg-forest-light transition-colors"
              >
                Get started for free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by / Differentiator — full-width logo bar */}
      <section className="w-full border-y border-border-soft py-6 animate-fade-up">
        <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap px-6">
          <span className="text-base font-semibold text-foreground whitespace-nowrap">Built by students admitted to</span>
          <SchoolLogo name="UC Berkeley" />
          <SchoolLogo name="COSMOS" />
          <span className="hidden sm:block w-px h-5 bg-border-soft" />
          <span className="text-base font-semibold text-foreground whitespace-nowrap">Inspired by</span>
          <ToolLogo name="Notion" />
          <ToolLogo name="Google Docs" />
          <ToolLogo name="Grammarly" />
        </div>
      </section>

      {/* Product showcase — full-bleed cards like Notion */}
      <section className="w-full px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-7xl mx-auto">
          {/* Dashboard card — wide, interactive-feeling */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 min-h-[220px]">
              <h4 className="text-base font-semibold text-foreground uppercase tracking-wide">Dashboard Structure</h4>
              <p className="mt-2 text-lg leading-relaxed text-text-secondary">
                Manage all your college and summer program applications in one place. Keep track of deadlines, essays, and research without switching between tabs. Easily revisit past responses to refine your drafts, organize &quot;Why This College&quot; insights, and stay in control, even during the most overwhelming parts of application season.
              </p>
            </div>
            <Link href={dashboardHref} className="group">
              <div className="feature-card bg-sage rounded-2xl p-6 sm:p-8 h-full">
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
                <h3 className="font-serif text-3xl sm:text-4xl tracking-tight text-foreground mb-3">
                  Your entire application,<br />organized.
                </h3>
                <div className="space-y-2 mt-4">
                  <div className="bg-white/50 rounded-lg px-4 py-2.5 text-base text-text-secondary flex items-center justify-between">
                    <span>Stanford — Early Action</span>
                    <span className="text-sm text-text-tertiary">Nov 1</span>
                  </div>
                  <div className="bg-white/50 rounded-lg px-4 py-2.5 text-base text-text-secondary flex items-center justify-between">
                    <span>MIT — Regular Decision</span>
                    <span className="text-sm text-text-tertiary">Jan 5</span>
                  </div>
                  <div className="bg-white/50 rounded-lg px-4 py-2.5 text-base text-text-secondary flex items-center justify-between">
                    <span>UC Berkeley — Essay Draft 2</span>
                    <span className="text-sm text-forest-muted font-medium">In progress</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Analyzer card */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 min-h-[220px]">
              <h4 className="text-base font-semibold text-foreground uppercase tracking-wide">Narrative Analyzer</h4>
              <p className="mt-2 text-lg leading-relaxed text-text-secondary">
                Discover the strongest way to frame your story. Based on your activities, projects, and interests, we help you identify compelling narrative angles tailored to each college or program. Instead of guessing what to emphasize, you&apos;ll have a clear, strategic direction for your entire application.
              </p>
            </div>
            <Link href={analyzerHref} className="group">
              <div className="feature-card bg-sage rounded-2xl p-6 sm:p-8 h-full">
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
                <h3 className="font-serif text-3xl sm:text-4xl tracking-tight text-foreground mb-3">
                  Find the narrative<br />only you can tell.
                </h3>
                <div className="space-y-2 mt-4">
                  <div className="bg-white/50 rounded-lg px-4 py-2.5 text-base text-text-secondary">
                    <span className="text-sm font-medium text-forest-muted">Primary theme:</span> Environmental data + civic impact
                  </div>
                  <div className="bg-white/50 rounded-lg px-4 py-2.5 text-base text-text-secondary">
                    <span className="text-sm font-medium text-forest-muted">Evidence:</span> Air quality research, Climate blog, Internship
                  </div>
                  <div className="bg-white/50 rounded-lg px-4 py-2.5 text-base text-text-secondary">
                    <span className="text-sm font-medium text-forest-muted">Angle:</span> Data-driven environmental storytelling
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Value props row — compact strip */}
        <div className="max-w-7xl mx-auto mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-forest px-6 py-5 text-white flex items-center gap-4">
            <p className="text-4xl font-serif leading-none">0%</p>
            <p className="text-base text-white/60">AI-written content.</p>
          </div>
          <div className="rounded-2xl bg-ivory border border-border-soft px-6 py-5 flex items-center gap-4">
            <p className="text-4xl font-serif text-foreground leading-none">100%</p>
            <p className="text-base text-text-tertiary">Your voice, preserved. We only give feedback.</p>
          </div>
          <div className="rounded-2xl bg-ivory border border-border-soft px-6 py-5 flex items-center gap-4">
            <p className="text-4xl font-serif text-foreground leading-none">1</p>
            <p className="text-base text-text-tertiary">Organization platform for everything.</p>
          </div>
        </div>
      </section>

      {/* CTA — full-width forest band */}
      <section className="w-full bg-forest py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="font-serif text-5xl sm:text-6xl tracking-tight text-white">
            Your story is already there.
            <br />
            <span className="font-serif italic text-white/50">Let&apos;s find it.</span>
          </h2>
          <div className="mt-8">
            <Link
              href={primaryCtaHref}
              className="rounded-full bg-white text-forest px-9 py-3.5 text-lg font-semibold hover:bg-white/90 transition-colors"
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
