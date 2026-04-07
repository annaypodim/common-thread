import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignInButton, SignOutButton } from "./auth-buttons";

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
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
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-white/60 hidden sm:block">
              {user.user_metadata?.full_name ?? user.email}
            </span>
            <SignOutButton />
          </>
        ) : (
          <SignInButton />
        )}
      </div>
    </nav>
  );
}
