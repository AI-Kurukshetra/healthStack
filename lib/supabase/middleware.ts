import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set([
  "/",
  "/pricing",
  "/login",
  "/register",
  "/forgot-password",
  "/update-password",
  "/sign-up-success",
]);

const authRedirectPaths = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/update-password",
  "/sign-up-success",
]);

const onboardingPath = "/onboarding";

export function isPublicPath(pathname: string): boolean {
  return (
    publicPaths.has(pathname) ||
    pathname.startsWith("/auth/confirm") ||
    pathname.startsWith("/auth/error") ||
    pathname.startsWith("/api/auth")
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");

  const isPathPublic = isPublicPath(pathname);

  if (!data.user && !isPathPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (data.user && authRedirectPaths.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const isPlatformAdmin = data.user?.user_metadata?.role === "admin";

  if (data.user && !isPathPublic && !isApiRoute && !isPlatformAdmin) {
    const { data: memberships, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("user_id", data.user.id)
      .limit(1);

    const hasMembership =
      !membershipError && Array.isArray(memberships) && memberships.length > 0;

    if (!hasMembership && pathname !== onboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = onboardingPath;
      return NextResponse.redirect(url);
    }

    if (hasMembership && pathname === onboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
