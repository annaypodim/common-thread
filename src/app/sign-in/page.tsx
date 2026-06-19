import { GoogleSignInButton, UpgradeWithGoogleButton } from "@/components/auth-buttons";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ conflict?: string }>;
}) {
  const { conflict } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already a permanent account — nothing to do here.
  if (user && !user.is_anonymous) {
    redirect("/dashboard");
  }

  const isGuest = Boolean(user?.is_anonymous);
  // After a link conflict we always sign in to the existing account (no in-place
  // upgrade), even for a guest, so their existing data loads.
  const showUpgrade = isGuest && conflict !== "1";

  const heading = conflict === "1"
    ? "That account already exists"
    : isGuest
    ? "Save your work"
    : "Sign in to continue";

  const description = conflict === "1"
    ? "That Google account is already registered. Sign in to continue to your existing account."
    : isGuest
    ? "You're using a guest session. Sign in with Google to save your work permanently and access it on any device."
    : "Use your Google account to access your dashboard, analyzer, and writing workspace. We keep your drafts and research synced across every session.";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 bg-ivory text-center">
      <div className="w-full max-w-md rounded-3xl border border-border-soft bg-white/90 p-10 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-forest">
          {isGuest && conflict !== "1" ? "Almost there" : "Welcome"}
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-foreground">
          {heading}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          {description}
        </p>
        <div className="mt-8">
          {showUpgrade ? (
            <UpgradeWithGoogleButton className="w-full justify-center" label="Continue with Google" />
          ) : (
            <GoogleSignInButton className="w-full justify-center" label="Continue with Google" />
          )}
        </div>
      </div>
    </div>
  );
}
