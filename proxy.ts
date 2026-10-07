import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedMiniApp =
    pathname === "/apps" ||
    pathname.startsWith("/apps/") ||
    pathname === "/notes" ||
    pathname.startsWith("/notes/") ||
    pathname === "/sales" ||
    pathname.startsWith("/sales/") ||
    pathname === "/skye" ||
    pathname.startsWith("/skye/");

  if (isProtectedMiniApp && !user) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("auth", "login");
    redirectUrl.searchParams.set("redirectTo", pathname + request.nextUrl.search);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  const authParam = request.nextUrl.searchParams.get("auth");
  const redirectToParam = request.nextUrl.searchParams.get("redirectTo");
  const isGuestAuthMode =
    authParam === "login" || authParam === "signup" || authParam === "forgot-password";

  if (user && isGuestAuthMode) {
    const safeRedirect =
      redirectToParam &&
      redirectToParam.startsWith("/") &&
      !redirectToParam.startsWith("//") &&
      !redirectToParam.startsWith("/\\")
        ? redirectToParam
        : null;

    const targetUrl = new URL(
      safeRedirect && safeRedirect !== "/" ? safeRedirect : (pathname === "/" ? "/" : pathname),
      request.url
    );
    if (targetUrl.pathname === "/") {
      targetUrl.searchParams.delete("auth");
      targetUrl.searchParams.delete("redirectTo");
    }
    const redirectResponse = NextResponse.redirect(targetUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (*.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
