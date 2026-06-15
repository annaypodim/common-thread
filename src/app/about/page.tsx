import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="flex-1 bg-ivory px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex rounded-full border border-border-soft bg-white px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        >
          Back to Common Thread
        </Link>

        <div className="mt-10 border-b border-border-soft pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-forest-muted">
            About
          </p>
          <h1 className="mt-3 font-serif text-5xl tracking-tight text-foreground sm:text-6xl">
            About Common Thread
          </h1>
        </div>

        <div className="py-8 text-base leading-7 text-text-secondary">
          <p>
            Common Thread helps students organize college and summer program
            applications, find stronger narrative angles, and keep planning work
            in one place.
          </p>
          <p className="mt-4">
            More information about the app and its developers will be added
            here as the project grows.
          </p>
        </div>
      </section>
    </main>
  );
}
