"use client";

import { signInWithGoogle, signOut } from "@/lib/auth";

export function SignInButton() {
  return (
    <button
      onClick={() => signInWithGoogle()}
      className="text-base text-white/60 hover:text-white transition-colors nav-link cursor-pointer"
    >
      sign in
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
