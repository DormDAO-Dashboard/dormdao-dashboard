import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRegisteredUser } from "@/lib/access-control";
import { slugify } from "@/lib/utils";

const SCHOOL_OK_COOKIE = "ddo-school-ok";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const allowed = await isRegisteredUser(user.email, undefined);
        if (!allowed) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=not_member`);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, school")
          .eq("id", user.id)
          .single();

        if (!profile?.school) {
          return NextResponse.redirect(`${origin}/profile?setup=1`);
        }

        const slug = slugify(profile.school);
        const res = NextResponse.redirect(`${origin}/schools/${slug}/vote`);
        res.cookies.set(SCHOOL_OK_COOKIE, "1", { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
        return res;
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
