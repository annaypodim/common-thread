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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
