import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  // Fast path: API routes handle their own auth - skip middleware entirely
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  const publicPaths = ["/login", "/signup", "/auth/callback", "/share"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Check onboarding cookie BEFORE creating Supabase client (zero-cost)
  const onboardingDone = request.cookies.get("onboarding_done")?.value === "1";

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() is fast (local JWT check)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Fast return: onboarding already done (cookie cached) - no DB query needed
  if (!session || isPublicPath || onboardingDone) {
    return supabaseResponse;
  }

  // Only check onboarding for non-onboarding page routes (not API, not already onboarding)
  const isOnboarding = pathname.startsWith("/onboarding");
  if (isOnboarding) {
    return supabaseResponse;
  }

  // DB query only happens once per user (until cookie is set)
  try {
    const { data: prefs, error } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", session.user.id)
      .single();

    if (!error && prefs && prefs.onboarding_completed === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (!error && prefs && prefs.onboarding_completed === true) {
      supabaseResponse.cookies.set("onboarding_done", "1", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
  } catch {
    // If preferences table doesn't exist yet or other error, skip check
  }

  return supabaseResponse;
}
