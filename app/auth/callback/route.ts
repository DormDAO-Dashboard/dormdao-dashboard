import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRegisteredUser } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Gate: only registered admins/members can sign in
        const allowed = await isRegisteredUser(user.email, undefined);
        if (!allowed) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=not_member`);
        }

        // New user or incomplete profile → profile setup
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, school")
          .eq("id", user.id)
          .single();

        if (!profile?.display_name) {
          return NextResponse.redirect(`${origin}/profile?setup=1`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
