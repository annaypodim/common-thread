import { requireUser } from "@/lib/auth";

export default async function Dashboard() {
  await requireUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 font-sans bg-zinc-50 dark:bg-zinc-950">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Your college application hub — coming soon.
      </p>
    </div>
  );
}
