"use client";

import { signInWithGoogle, signOut } from "@/lib/auth";

type GoogleButtonProps = {
  label?: string;
  className?: string;
};

export function GoogleSignInButton({
  label = "Continue with Google",
  className = "",
}: GoogleButtonProps) {
  return (
    <button
      onClick={() => signInWithGoogle()}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-forest-light ${className}`}
    >
      {label}
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-sm text-white/40 hover:text-white transition-colors nav-link cursor-pointer"
    >
      sign out
    </button>
  );
}
