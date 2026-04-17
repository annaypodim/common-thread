import { requireUser } from "@/lib/auth";

function formatCollegeName(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CollegeWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const collegeName = formatCollegeName(slug ?? "college");

  return (
    <div className="flex flex-1 bg-ivory px-4 py-6 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-5xl space-y-5">
        <section className="rounded-2xl border border-border-soft bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">College Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{collegeName}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Placeholder layout for college-specific supplementals, research, and planning notes.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-border-soft bg-white p-5">
            <h2 className="text-lg font-semibold">Supplementals</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li className="rounded-lg border border-border-soft bg-ivory/60 px-3 py-2">Why {collegeName}? (650 words) — Drafting</li>
              <li className="rounded-lg border border-border-soft bg-ivory/60 px-3 py-2">Community Contribution Essay — Outline ready</li>
              <li className="rounded-lg border border-border-soft bg-ivory/60 px-3 py-2">Short Responses — 2/4 complete</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-border-soft bg-white p-5">
            <h2 className="text-lg font-semibold">College Research</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li className="rounded-lg border border-border-soft bg-ivory/60 px-3 py-2">Programs of interest: Symbolic Systems, Human-Centered AI</li>
              <li className="rounded-lg border border-border-soft bg-ivory/60 px-3 py-2">Campus culture note: collaborative + maker-focused communities</li>
              <li className="rounded-lg border border-border-soft bg-ivory/60 px-3 py-2">Potential mentors/labs list: starter set created</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
