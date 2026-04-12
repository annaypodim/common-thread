import { GoogleSignInButton } from "@/components/auth-buttons";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 bg-ivory text-center">
      <div className="w-full max-w-md rounded-3xl border border-border-soft bg-white/90 p-10 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-forest">Welcome back</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-foreground">
          Sign in to continue
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          Use your Google account to access your dashboard, analyzer, and writing workspace. We keep your drafts and research synced across every session.
        </p>
        <div className="mt-8">
          <GoogleSignInButton className="w-full justify-center" label="Continue with Google" />
        </div>
      </div>
    </div>
  );
}
