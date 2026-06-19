import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// App routes that require a (possibly guest) session. Visiting any of these
// without a session lazily provisions an anonymous Supabase user so people can
// use the app without signing in with Google. Marketing routes (/, /about,
// /privacy-policy) are intentionally excluded so drive-by visitors don't
// create auth.users rows.
const APP_PREFIXES = ["/dashboard", "/profile", "/analyzer"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this keeps the auth token alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lazily create a guest (anonymous) session the first time someone enters the
  // app. signInAnonymously() fires the cookie `setAll` callback above, so the
  // new session cookie lands on both `request` and `supabaseResponse`, making
  // the guest visible to this same request's server-component render.
  const isAppRoute = APP_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (!user && isAppRoute) {
    await supabase.auth.signInAnonymously();
  }

  return supabaseResponse;
}
