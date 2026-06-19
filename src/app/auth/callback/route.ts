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

  // A guest tried to link a Google account that already belongs to another
  // account. We don't merge guest data into the existing account (for now), so
  // send them to sign-in to log into that existing account instead.
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
