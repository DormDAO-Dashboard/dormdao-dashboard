import { NextRequest, NextResponse } from "next/server";
import { schoolNameFromSlug } from "@/lib/schoolData";
import { getEffectiveSchoolSocials, saveSchoolSocialsOverride, EDITABLE_SOCIAL_FIELDS } from "@/lib/school-socials-store";
import { canEditSchoolProfile } from "@/lib/school-profile-access";

// Whether the signed-in user may edit this school's profile — drives the
// edit button on the school page.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const schoolName = schoolNameFromSlug(slug);
  if (!schoolName) return NextResponse.json({ error: "Unknown school" }, { status: 404 });
  return NextResponse.json({ canEdit: await canEditSchoolProfile(schoolName) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const schoolName = schoolNameFromSlug(slug);
  if (!schoolName) return NextResponse.json({ error: "Unknown school" }, { status: 404 });
  if (!(await canEditSchoolProfile(schoolName))) {
    return NextResponse.json({ error: "Only admins and this school's Directors and Presidents can edit its profile" }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;

  // Trim every field; blank means "no link" (an explicit "" also clears a
  // built-in link from SCHOOL_SOCIALS). Only http(s) links are accepted.
  const fields: Record<string, string> = {};
  for (const key of EDITABLE_SOCIAL_FIELDS) {
    const value = typeof body[key] === "string" ? (body[key] as string).trim() : "";
    if (value && !/^https?:\/\/\S+$/i.test(value)) {
      return NextResponse.json({ error: `${key[0].toUpperCase()}${key.slice(1)} must be a full link starting with https://` }, { status: 400 });
    }
    fields[key] = value;
  }

  try {
    await saveSchoolSocialsOverride(schoolName, fields);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ socials: await getEffectiveSchoolSocials(schoolName) });
}
