import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getMemberForUser } from "@/lib/access-control";
import { isAdminUser } from "@/lib/admin-config";
import { logLoginAttempt } from "@/lib/login-attempts";
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
        // Admin bypass — no allowlist check needed
        if (isAdminUser(user.email, undefined)) {
          const res = NextResponse.redirect(`${origin}/admin`);
          res.cookies.set(SCHOOL_OK_COOKIE, "1", { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
          return res;
        }

        // Check allowlist via member record (which also carries school)
        const member = await getMemberForUser(user.email, undefined);
        if (!member) {
          await logLoginAttempt({ email: user.email ?? undefined, reason: "not_registered" });
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=not_registered`);
        }

        // Stamp the pre-assigned school and role onto the profile,
        // pulling extra fields from an approved signup request if present
        const serviceClient = createServiceClient();
        const { data: signupRequest } = await serviceClient
          .from("signup_requests")
          .select("grad_year, major, linkedin, telegram")
          .eq("email", (user.email ?? "").toLowerCase())
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        await serviceClient
          .from("profiles")
          .upsert({
            id: user.id,
            school: member.school ?? null,
            role: member.role ?? "member",
            ...(signupRequest?.grad_year != null && { grad_year: signupRequest.grad_year }),
            ...(signupRequest?.major    && { major:    signupRequest.major }),
            ...(signupRequest?.linkedin && { linkedin: signupRequest.linkedin }),
            ...(signupRequest?.telegram && { telegram: signupRequest.telegram }),
          }, { onConflict: "id" });

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        // New user: go to profile setup (display_name + avatar; school pre-filled read-only)
        if (!profile?.display_name) {
          return NextResponse.redirect(`${origin}/profile?setup=1`);
        }

        // Returning user: go to their school vote page
        const schoolSlug = member.school ? slugify(member.school) : "";
        const destination = schoolSlug ? `${origin}/schools/${schoolSlug}/vote` : `${origin}/`;
        const res = NextResponse.redirect(destination);
        res.cookies.set(SCHOOL_OK_COOKIE, "1", { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
        return res;
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
