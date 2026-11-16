import { createServiceClient } from "./supabase/server";
import { SCHOOL_SOCIALS, type SchoolSocials } from "./schoolData";

const BUCKET = "admin-data";
const FILE   = "school-socials.json";

// school name (SCHOOL_NAMES entry, e.g. "Oregon") -> link overrides entered
// in the school page's editor, plus an uploaded profile photo (photoUrl).
// Same override-wins pattern as EmailTemplateOverrides.
export type SchoolProfileOverride = Partial<SchoolSocials> & { photoUrl?: string };
export type SchoolSocialsOverrides = Record<string, SchoolProfileOverride>;

// Link fields the editor exposes.
export const EDITABLE_SOCIAL_FIELDS = ["website", "twitter", "linkedin", "instagram", "discord", "github", "telegram"] as const;

async function getStorage() {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error && !error.message.toLowerCase().includes("already")) {
    console.error("Storage bucket error:", error.message);
  }
  return supabase.storage.from(BUCKET);
}

// Short in-memory cache: every school logo on the site resolves through
// getSchoolPhotoUrl (app/api/schools/[slug]/photo), so this is read often.
let memo: { at: number; value: SchoolSocialsOverrides } | null = null;
const MEMO_MS = 60_000;

export async function getSchoolSocialsOverrides(): Promise<SchoolSocialsOverrides> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value;
  const value = await readOverrides();
  memo = { at: Date.now(), value };
  return value;
}

async function readOverrides(): Promise<SchoolSocialsOverrides> {
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

// Merges into the school's existing override, so saving links keeps the
// photo and vice versa.
export async function saveSchoolSocialsOverride(
  schoolName: string,
  fields: SchoolProfileOverride
): Promise<void> {
  const overrides = await readOverrides();
  overrides[schoolName] = { ...overrides[schoolName], ...fields };
  memo = null;
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
  const links = { ...override };
  delete links.photoUrl;
  return { ...base, ...links };
}

export async function getSchoolPhotoUrl(schoolName: string): Promise<string | null> {
  const overrides = await getSchoolSocialsOverrides();
  return overrides[schoolName]?.photoUrl || null;
}
