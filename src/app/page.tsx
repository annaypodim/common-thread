import Link from "next/link";

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

function FeatureCard({
  title,
  description,
  icon,
  delay,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  delay: string;
}) {
  return (
    <div
      className="feature-card bg-periwinkle rounded-2xl p-8 animate-fade-up cursor-default"
      style={{ animationDelay: delay }}
    >
      <div className="mb-4 text-forest-muted">{icon}</div>
      <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
        {title}
      </h3>
      <p className="text-base leading-relaxed text-text-secondary">{description}</p>
    </div>
  );
}

function PreviewCard({
  label,
  items,
  delay,
}: {
  label: string;
  items: string[];
  delay: string;
}) {
  return (
    <div
      className="preview-card bg-periwinkle rounded-2xl p-8 min-h-[320px] flex flex-col justify-between animate-fade-up"
      style={{ animationDelay: delay }}
    >
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white/50 rounded-lg px-4 py-3 text-base text-text-secondary"
          >
            {item}
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-white/30">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

function SchoolLogo({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-border-soft text-sm font-medium text-text-secondary">
      <span className="w-5 h-5 rounded-full bg-border-soft flex items-center justify-center text-[9px] font-bold text-text-tertiary">
        {name[0]}
      </span>
      {name}
    </span>
  );
}

function ToolLogo({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 border border-border-soft text-sm font-medium text-text-secondary">
      {name}
    </span>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <div className="noise-overlay" />

      {/* Navbar */}
      <nav className="w-full px-6 sm:px-10 py-5 flex items-center justify-between animate-fade-in sticky top-0 z-40 bg-forest">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            common thread
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-base text-white/60">
            <Link href="/analyzer" className="nav-link hover:text-white transition-colors">
              find your angle
            </Link>
            <Link href="#" className="nav-link hover:text-white transition-colors">
              proofread your essay
            </Link>
          </div>
        </div>
        <Link
          href="#"
          className="text-base text-white/60 hover:text-white transition-colors nav-link"
        >
          sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="w-full max-w-5xl mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-20">
        <div className="text-center">
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tight text-foreground animate-fade-up">
            <span className="block" style={{ animationDelay: "0.1s" }}>
              Application: Submitted
              <CheckIcon delay="0.6s" />
            </span>
            <span
              className="block mt-1 animate-fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              Counseling: Free
              <CheckIcon delay="0.8s" />
            </span>
            <span
              className="block mt-1 animate-fade-up"
              style={{ animationDelay: "0.3s" }}
            >
              Written by: You, always
              <CheckIcon delay="1.0s" />
            </span>
          </h1>

          <p
            className="mt-8 max-w-xl mx-auto text-lg sm:text-xl leading-relaxed text-text-secondary animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            The application strategy platform that helps you find your narrative
            and organize everything in one place.
            Built by students who&apos;ve been through it.
          </p>

          <div
            className="mt-8 flex justify-center gap-4 animate-fade-up"
            style={{ animationDelay: "0.6s" }}
          >
            <Link
              href="/dashboard"
              className="rounded-full bg-forest text-white px-8 py-3 text-base font-medium hover:bg-forest-light transition-colors"
            >
              Get started for free
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <FeatureCard
            title="Narrative Planner"
            description="Map your activities, awards, and interests into a cohesive application story. See what narrative threads tie your experiences together."
            icon={
              <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                <path d="M4 8h20M4 14h14M4 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="22" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M22 16v4M20 18h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            }
            delay="0.7s"
          />
          <FeatureCard
            title="College Organizer"
            description="Track deadlines, essay prompts, drafts, and research for every school on your list. One workspace, zero chaos."
            icon={
              <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                <rect x="3" y="4" width="22" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path d="M3 10h22M10 10v14" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="6.5" cy="7" r="1" fill="currentColor" opacity="0.3" />
                <circle cx="9.5" cy="7" r="1" fill="currentColor" opacity="0.3" />
              </svg>
            }
            delay="0.8s"
          />
        </div>
      </section>

      {/* Differentiator */}
      <section className="w-full bg-ivory">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
          <h2
            className="font-serif text-3xl sm:text-4xl md:text-5xl tracking-tight text-foreground text-center animate-fade-up"
          >
            What makes common thread different
          </h2>

          <div className="mt-14 max-w-2xl mx-auto space-y-10">
            {/* Founders */}
            <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <p className="text-base font-medium text-text-tertiary uppercase tracking-widest mb-3">
                Built by students admitted to
              </p>
              <div className="flex flex-wrap gap-2">
                <SchoolLogo name="UC Berkeley" />
                <SchoolLogo name="COSMOS" />
              </div>
            </div>

            {/* Tools */}
            <div className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
              <p className="text-base font-medium text-text-tertiary uppercase tracking-widest mb-3">
                Inspired by the tools you already love
              </p>
              <div className="flex flex-wrap gap-2">
                <ToolLogo name="Notion" />
                <ToolLogo name="Google Docs" />
                <ToolLogo name="Grammarly" />
                <ToolLogo name="Common App" />
              </div>
            </div>

            {/* Value props */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 animate-fade-up"
              style={{ animationDelay: "0.35s" }}
            >
              <div className="text-center sm:text-left">
                <p className="text-3xl font-serif text-foreground">0%</p>
                <p className="text-sm text-text-tertiary mt-1">AI-written content</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-3xl font-serif text-foreground">100%</p>
                <p className="text-sm text-text-tertiary mt-1">your voice, preserved</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-3xl font-serif text-foreground">1</p>
                <p className="text-sm text-text-tertiary mt-1">place for everything</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Preview */}
      <section className="w-full max-w-5xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <PreviewCard
            label="Dashboard"
            items={[
              "College list with deadlines",
              "Essay drafts & revisions",
              "Interview prep notes",
              "Pros & cons for each school",
            ]}
            delay="0.1s"
          />
          <PreviewCard
            label="Analyzer"
            items={[
              "Enter your activities & awards",
              "Identify narrative themes",
              "See supporting evidence",
              "Get essay angle suggestions",
            ]}
            delay="0.2s"
          />
        </div>

        {/* CTA */}
        <div className="mt-20 text-center animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-foreground">
            Your story is already there.
            <br />
            <span className="font-serif italic text-forest-muted">Let&apos;s find it.</span>
          </h2>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="rounded-full bg-forest text-white px-9 py-3.5 text-base font-medium hover:bg-forest-light transition-colors"
            >
              Start planning for free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-forest mt-auto">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-white/50">
            &copy; 2026 common thread
          </span>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="#" className="hover:text-white transition-colors">privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">terms</Link>
            <Link href="#" className="hover:text-white transition-colors">contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
