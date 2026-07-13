import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SCHOOL_OK_COOKIE = "ddo-school-ok";
const ONE_YEAR = 60 * 60 * 24 * 365;

function isExempt(pathname: string): boolean {
  if (pathname === "/profile" || pathname === "/login") return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user && !isExempt(request.nextUrl.pathname)) {
    // Fast path: cache cookie confirms school is set
    if (request.cookies.get(SCHOOL_OK_COOKIE)?.value === "1") {
      return supabaseResponse;
    }

    // Slow path: check DB (runs once until cookie is stamped).
    // School is pre-assigned by admin and stamped at auth callback / wallet
    // login — so this redirect fires only for legacy accounts or missed upserts.
    const { data: profile } = await supabase
      .from("profiles")
      .select("school")
      .eq("id", user.id)
      .single();

    if (!profile?.school) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile";
      url.search = "?setup=1";
      return NextResponse.redirect(url);
    }

    // Stamp cache cookie so next request skips the DB call
    supabaseResponse.cookies.set(SCHOOL_OK_COOKIE, "1", {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
