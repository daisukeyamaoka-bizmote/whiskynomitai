import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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

  // getSession() is fast (local JWT check), getUser() hits Supabase API every time
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const publicPaths = ["/login", "/signup", "/auth/callback"];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect to onboarding if not completed (skip for API routes and onboarding itself)
  const isOnboarding = request.nextUrl.pathname.startsWith("/onboarding");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (session && !isPublicPath && !isOnboarding && !isApiRoute) {
    // Check cookie cache first to avoid DB query on every request
    const onboardingDone = request.cookies.get("onboarding_done")?.value;

    if (onboardingDone === "1") {
      return supabaseResponse;
    }

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
  }

  return supabaseResponse;
}
