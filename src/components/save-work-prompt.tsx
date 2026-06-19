"use client";

import { upgradeWithGoogle } from "@/lib/auth";

export function SaveWorkPrompt({
  isAnonymous,
  show,
}: {
  isAnonymous: boolean;
  show: boolean;
}) {
  if (!isAnonymous || !show) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border-soft bg-forest px-5 py-4 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Save your work</p>
          <p className="mt-0.5 text-sm text-white/70">
            You&rsquo;re using a guest session. Sign in to keep your work and access it on any device.
          </p>
        </div>
        <button
          type="button"
          onClick={() => upgradeWithGoogle()}
          className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-semibold text-forest transition-colors hover:bg-white/90"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
