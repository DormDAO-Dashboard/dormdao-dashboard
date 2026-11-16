import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { schoolNameFromSlug, SCHOOL_DOMAINS } from "@/lib/schoolData";
import { getSchoolPhotoUrl, saveSchoolSocialsOverride } from "@/lib/school-socials-store";
import { canEditSchoolProfile } from "@/lib/school-profile-access";
import { LOCAL_SCHOOL_LOGOS } from "@/lib/school-logos";

const BUCKET = "school-photos";
const MAX_BYTES = 2 * 1024 * 1024;
// No SVG: it can carry script.
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

// Every SchoolLogo on the site loads this. Redirects to the uploaded
// profile photo, else the built-in logo (local file or the school site's
// favicon); 404 when there's none, which SchoolLogo shows as initials.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const schoolName = schoolNameFromSlug(slug);
  if (!schoolName) return new NextResponse(null, { status: 404 });

  const uploaded = await getSchoolPhotoUrl(schoolName);
  const local = LOCAL_SCHOOL_LOGOS[schoolName];
  const domain = SCHOOL_DOMAINS[schoolName];
  const target = uploaded
    ?? (local ? new URL(local, req.url).toString() : null)
    ?? (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null);
  if (!target) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } });

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=600");
  return res;
}

async function storage() {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error && !error.message.toLowerCase().includes("already")) console.error("Storage bucket error:", error.message);
  return supabase.storage.from(BUCKET);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const schoolName = schoolNameFromSlug(slug);
  if (!schoolName) return NextResponse.json({ error: "Unknown school" }, { status: 404 });
  if (!(await canEditSchoolProfile(schoolName))) {
    return NextResponse.json({ error: "Only admins and this school's Directors and Presidents can edit its profile" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Photo must be a PNG, JPG, WebP or GIF" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo must be under 2 MB" }, { status: 400 });

  const store = await storage();
  const path = `${slug}/${Date.now()}.${ext}`;
  const { error } = await store.upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const photoUrl = store.getPublicUrl(path).data.publicUrl;
  try {
    await saveSchoolSocialsOverride(schoolName, { photoUrl });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
  return NextResponse.json({ photoUrl });
}

// Back to the built-in logo.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const schoolName = schoolNameFromSlug(slug);
  if (!schoolName) return NextResponse.json({ error: "Unknown school" }, { status: 404 });
  if (!(await canEditSchoolProfile(schoolName))) {
    return NextResponse.json({ error: "Only admins and this school's Directors and Presidents can edit its profile" }, { status: 403 });
  }
  try {
    await saveSchoolSocialsOverride(schoolName, { photoUrl: "" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
  return NextResponse.json({ photoUrl: null });
}
