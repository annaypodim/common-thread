import Link from "next/link";

export function BottomBanner() {
  return (
    <footer className="w-full border-t border-border-soft bg-forest text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <p className="text-sm font-semibold tracking-tight">common thread</p>
          <p className="mt-0.5 text-xs text-white/60">
            Application planning tools built for students.
          </p>
        </div>

        <nav
          aria-label="Common Thread links"
          className="flex flex-wrap items-center gap-2"
        >
          <a
            href="mailto:findyourcommonthread@gmail.com"
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white"
          >
            Contact us
          </a>
          <Link
            href="/about"
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white"
          >
            About
          </Link>
          <Link
            href="/privacy-policy"
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white"
          >
            Privacy policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
