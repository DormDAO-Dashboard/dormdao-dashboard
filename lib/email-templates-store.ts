import { createServiceClient } from "./supabase/server";
import { EMAIL_TEMPLATES } from "./email-templates";

const BUCKET = "admin-data";
const FILE   = "email-templates.json";

// key (EmailTemplateDef.key) -> { fieldKey: overriddenValue }
export type EmailTemplateOverrides = Record<string, Record<string, string>>;

async function getStorage() {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error && !error.message.toLowerCase().includes("already")) {
    console.error("Storage bucket error:", error.message);
  }
  return supabase.storage.from(BUCKET);
}

export async function getEmailTemplateOverrides(): Promise<EmailTemplateOverrides> {
  try {
    const storage = await getStorage();
    const { data, error } = await storage.download(FILE);
    if (error || !data) return {};
    const text = await data.text();
    return JSON.parse(text) as EmailTemplateOverrides;
  } catch {
    return {};
  }
}

export async function saveEmailTemplateOverride(key: string, fields: Record<string, string>): Promise<void> {
  const overrides = await getEmailTemplateOverrides();
  overrides[key] = fields;
  const storage = await getStorage();
  const { error } = await storage.upload(FILE, JSON.stringify(overrides, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

// Merges a template's field defaults with any saved override — the shape
// lib/email.ts's send functions actually consume when building an email.
export async function getEffectiveTemplateFields(key: string): Promise<Record<string, string>> {
  const def = EMAIL_TEMPLATES.find((t) => t.key === key);
  if (!def) return {};
  const overrides = await getEmailTemplateOverrides();
  const override = overrides[key] ?? {};
  const result: Record<string, string> = {};
  for (const f of def.fields) result[f.key] = override[f.key] ?? f.default;
  return result;
}

export async function resetEmailTemplateOverride(key: string): Promise<void> {
  const overrides = await getEmailTemplateOverrides();
  delete overrides[key];
  const storage = await getStorage();
  const { error } = await storage.upload(FILE, JSON.stringify(overrides, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}
