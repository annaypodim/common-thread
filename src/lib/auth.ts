"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function signInWithGoogle() {
  const supabase = await createClient();

  // Prefer an explicit, configured site URL so the redirect_to we send to
  // Supabase always matches the allow-list (the request `origin` header is
  // unreliable behind Vercel's proxy / custom domains). Fall back to the
  // request origin for local dev where the env var isn't set.
  const headerList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? headerList.get("origin") ?? "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(data.url);
}

export async function upgradeWithGoogle() {
  const supabase = await createClient();

  const headerList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? headerList.get("origin") ?? "";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Upgrade a guest in place: linkIdentity keeps the same user.id, so all of
  // the guest's data (profile, activities, honors, analysis, colleges) becomes
  // the permanent account's data with no migration. The identity-already-exists
  // conflict only surfaces after the Google round-trip and is handled in
  // /auth/callback. For non-guests (or if manual linking is disabled) we fall
  // through to a normal Google sign-in.
  if (user?.is_anonymous) {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (!error && data?.url) {
      redirect(data.url);
    }
  }

  return signInWithGoogle();
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
