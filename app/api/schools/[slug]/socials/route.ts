import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { schoolNameFromSlug } from "@/lib/schoolData";
import { getEffectiveSchoolSocials, saveSchoolSocialsOverride } from "@/lib/school-socials-store";

// Same "true admin" gate as /admin/* pages (lib/admin-guard.ts's
// requireAdmin) — deliberately NOT canModerate()/club-leadership, per the
// explicit ask that only admins with access to the admin page can edit this.
async function requireTrueAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return true;
  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return prof?.role === "dorm_admin";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await requireTrueAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const schoolName = schoolNameFromSlug(slug);
  if (!schoolName) return NextResponse.json({ error: "Unknown school" }, { status: 404 });

  const body = await req.json() as {
    website?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };

  // Trim every field; an all-whitespace entry is treated as "cleared" (empty
  // string) rather than saved as literal whitespace, same as leaving it
  // blank — both mean "no link", and SocialLinks' falsy check on the
  // resulting empty string already handles hiding it.
  const fields = {
    website: (body.website ?? "").trim(),
    twitter: (body.twitter ?? "").trim(),
    linkedin: (body.linkedin ?? "").trim(),
    instagram: (body.instagram ?? "").trim(),
  };

  try {
    await saveSchoolSocialsOverride(schoolName, fields);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ socials: await getEffectiveSchoolSocials(schoolName) });
}
