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

  // Fast path: static assets and Next.js internals
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return supabaseResponse;
  }

  const publicPaths = ["/login", "/signup", "/auth/callback", "/share"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Fast path: public paths don't need auth check at all
  if (isPublicPath) {
    return supabaseResponse;
  }

  // Check onboarding cookie BEFORE creating Supabase client (zero-cost)
  const onboardingDone = request.cookies.get("onboarding_done")?.value === "1";

  // Check if auth cookie exists before creating client (fast cookie check)
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  if (!hasAuthCookie) {
    // No auth cookie at all - redirect to login immediately without creating Supabase client
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated + onboarding done + not onboarding page = fast return (no DB query)
  const isOnboarding = pathname.startsWith("/onboarding");
  if (onboardingDone && !isOnboarding) {
    // Still need to create Supabase client to refresh session token
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

    // getSession() is fast (local JWT check) - just refresh token
    await supabase.auth.getSession();
    return supabaseResponse;
  }

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

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

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
