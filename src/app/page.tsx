import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center px-8 py-24 text-center">
        <div className="mb-4 text-sm font-medium tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
          Common Thread
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
          Find the story your
          <br />
          application tells.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Identify your strongest narrative angle, organize your college
          research, and plan your applications — all in one place.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-full bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/analyzer"
            className="rounded-full border border-zinc-300 dark:border-zinc-700 px-8 py-3 text-base font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Try the Angle Analyzer
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 max-w-2xl w-full">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-left">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Application Dashboard
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Organize colleges, deadlines, essay drafts, and notes in one
              Notion-style workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-left">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Angle Analyzer
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Enter your activities and interests. Get back your strongest
              narrative themes with supporting evidence.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
