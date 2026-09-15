import { createServiceClient } from "./supabase/server";
import { SCHOOL_SOCIALS, type SchoolSocials } from "./schoolData";

const BUCKET = "admin-data";
const FILE   = "school-socials.json";

// school name (SCHOOL_NAMES entry, e.g. "Oregon") -> admin-entered field
// overrides. Only the four fields exposed in the editor are ever written
// here — website/twitter/linkedin/instagram — same shape as SchoolSocials
// but partial, same pattern as EmailTemplateOverrides.
export type SchoolSocialsOverrides = Record<string, Partial<SchoolSocials>>;

async function getStorage() {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error && !error.message.toLowerCase().includes("already")) {
    console.error("Storage bucket error:", error.message);
  }
  return supabase.storage.from(BUCKET);
}

export async function getSchoolSocialsOverrides(): Promise<SchoolSocialsOverrides> {
  try {
    const storage = await getStorage();
    const { data, error } = await storage.download(FILE);
    if (error || !data) return {};
    const text = await data.text();
    return JSON.parse(text) as SchoolSocialsOverrides;
  } catch {
    return {};
  }
}

export async function saveSchoolSocialsOverride(
  schoolName: string,
  fields: Partial<SchoolSocials>
): Promise<void> {
  const overrides = await getSchoolSocialsOverrides();
  overrides[schoolName] = fields;
  const storage = await getStorage();
  const { error } = await storage.upload(FILE, JSON.stringify(overrides, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

// Merges the hardcoded SCHOOL_SOCIALS entry (scraped once, effectively
// read-only) with any admin-entered override — an override field always
// wins when present (including an explicit "" to intentionally clear a
// scraped value), same override-wins rule as email templates.
export async function getEffectiveSchoolSocials(schoolName: string): Promise<SchoolSocials> {
  const base = SCHOOL_SOCIALS[schoolName] ?? {};
  const overrides = await getSchoolSocialsOverrides();
  const override = overrides[schoolName] ?? {};
  return { ...base, ...override };
}
