import { createServiceClient } from "./supabase/server";

const BUCKET = "admin-data";
const SETTINGS_FILE = "data-collection-settings.json";
const SNAPSHOT_FILE = "schools-data-snapshot.json";

// Reads don't need the bucket to exist first — a download against a missing
// bucket just errors, which every read call site below already treats as a
// safe "nothing saved yet" no-op. Only writes (upload) require it.
function getReadStorage() {
  return createServiceClient().storage.from(BUCKET);
}

async function getWriteStorage() {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error && !error.message.toLowerCase().includes("already")) {
    console.error("Storage bucket error:", error.message);
  }
  return supabase.storage.from(BUCKET);
}

// isDataCollectionPaused() is called on every getSchoolsData() invocation —
// i.e. every page load on /, /schools, /schools/[slug], /analytics,
// /tokens, /activity — so an uncached Storage round trip here runs far more
// often than the 300s data cache it gates. A short TTL is enough: this is
// an admin toggle, not something that needs to react within seconds.
const PAUSED_CACHE_TTL_MS = 30_000;
let pausedCacheEntry: { value: boolean; expiresAt: number } | null = null;

// Admin-controlled kill switch for outbound Google Sheets calls. When paused,
// lib/cache.ts's getSchoolsData() must serve the last saved snapshot instead
// of calling fetchSheetsData() — this flag is the single source of truth for
// that decision, so check it before every live fetch, not just on a timer.
export async function isDataCollectionPaused(): Promise<boolean> {
  const now = Date.now();
  if (pausedCacheEntry && now < pausedCacheEntry.expiresAt) return pausedCacheEntry.value;

  let value = false;
  try {
    const storage = getReadStorage();
    const { data, error } = await storage.download(SETTINGS_FILE);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text) as { paused?: boolean };
      value = parsed.paused === true;
    }
  } catch {
    value = false;
  }

  pausedCacheEntry = { value, expiresAt: now + PAUSED_CACHE_TTL_MS };
  return value;
}

export async function setDataCollectionPaused(paused: boolean): Promise<void> {
  const storage = await getWriteStorage();
  const { error } = await storage.upload(SETTINGS_FILE, JSON.stringify({ paused }, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  pausedCacheEntry = { value: paused, expiresAt: Date.now() + PAUSED_CACHE_TTL_MS };
}

// Last known-good schools payload, refreshed on every successful live fetch
// (see lib/cache.ts) — this is what's served while paused, so the site stays
// on real data instead of going blank the moment the switch is flipped.
export async function getSchoolsSnapshot<T>(): Promise<T | null> {
  try {
    const storage = getReadStorage();
    const { data, error } = await storage.download(SNAPSHOT_FILE);
    if (error || !data) return null;
    const text = await data.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// Never throws — this runs on every live fetch (see lib/cache.ts), and a
// Storage hiccup here must not take down schools data that fetched fine.
export async function saveSchoolsSnapshot<T>(data: T): Promise<void> {
  try {
    const storage = await getWriteStorage();
    const { error } = await storage.upload(SNAPSHOT_FILE, JSON.stringify(data), {
      contentType: "application/json",
      upsert: true,
    });
    if (error) console.error("[data-collection-store] failed to save schools snapshot:", error.message);
  } catch (err) {
    console.error("[data-collection-store] failed to save schools snapshot:", err);
  }
}
