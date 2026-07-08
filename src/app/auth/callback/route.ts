import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // A stale guest-link flow can still report that the Google account already
  // belongs to another user. New sign-in attempts use normal OAuth directly, so
  // this branch is only a fallback for old/in-flight redirects.
  const errorCode = searchParams.get("error_code") ?? "";
  const errorDescription = searchParams.get("error_description") ?? "";
  const isIdentityConflict =
    errorCode === "identity_already_exists" ||
    /identity.*(exist|linked)/i.test(errorDescription);

  if (isIdentityConflict) {
    return NextResponse.redirect(`${origin}/sign-in?conflict=1`);
  }

  // Auth failed — redirect to home with error
  return NextResponse.redirect(`${origin}?error=auth`);
}
