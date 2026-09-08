import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { SCHOOL_NAMES } from "@/lib/schoolData";
import { slugify } from "@/lib/utils";

interface MemberRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  school: string | null;
  graduation_year: number | null;
  major: string | null;
  twitter: string | null;
  linkedin: string | null;
  telegram: string | null;
  is_public: boolean;
  public_fields: string[] | null;
  created_at: string;
}

// Same-school viewers (and now dorm_admins, for every school) can see every
// member of the school in the list, even ones who haven't gone public — but
// the fields shown are still masked by each member's own public_fields
// choice, matching the individual profile page and the global directory, so
// a clubmate (or an admin) never sees more than the member opted into.
function filterMemberFields(member: MemberRow) {
  const pf = Array.isArray(member.public_fields) ? member.public_fields : [];
  return {
    id: member.id,
    display_name: member.display_name,
    avatar_url: member.avatar_url,
    bio: pf.includes("bio") ? member.bio : null,
    school: pf.includes("school") ? member.school : null,
    graduation_year: pf.includes("graduation_year") ? member.graduation_year : null,
    major: pf.includes("major") ? member.major : null,
    twitter: pf.includes("twitter") ? member.twitter : null,
    linkedin: pf.includes("linkedin") ? member.linkedin : null,
    telegram: pf.includes("telegram") ? member.telegram : null,
  };
}

// Runs the member lookup through the service-role client rather than the
// browser's own Supabase client — whatever RLS policy gates the `profiles`
// table, a dorm_admin's elevated access has to be enforced here, server-side,
// not hoped for from client-side query shape.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const schoolName = (SCHOOL_NAMES as readonly string[]).find((n) => slugify(n) === slug);
  if (!schoolName) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const service = createServiceClient();

  let hasFullAccess = false;
  if (user) {
    if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) {
      hasFullAccess = true;
    } else {
      const { data: profile } = await service
        .from("profiles")
        .select("school, role")
        .eq("id", user.id)
        .single();
      hasFullAccess = profile?.role === "dorm_admin" || profile?.school === schoolName;
    }
  }

  let query = service
    .from("profiles")
    .select("id, display_name, avatar_url, bio, school, graduation_year, major, twitter, linkedin, telegram, is_public, public_fields, created_at")
    .eq("school", schoolName)
    .not("display_name", "is", null)
    .order("created_at", { ascending: true });

  if (!hasFullAccess) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members = ((data ?? []) as MemberRow[]).map(filterMemberFields);
  return NextResponse.json({ members, hasFullAccess });
}
