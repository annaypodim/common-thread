import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./auth-buttons";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="w-full px-6 sm:px-10 py-5 flex items-center justify-between animate-fade-in sticky top-0 z-40 bg-forest">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          common thread
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="hidden text-base text-white/85 sm:block">
              {user.user_metadata?.full_name ?? user.email}
            </span>
            <SignOutButton />
          </>
        ) : (
          <Link
            href="/sign-in"
            className="text-base text-white/60 hover:text-white transition-colors nav-link"
          >
            sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
