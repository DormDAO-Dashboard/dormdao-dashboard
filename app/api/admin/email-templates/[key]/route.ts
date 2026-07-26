import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getEmailTemplateDef } from "@/lib/email-templates";
import { saveEmailTemplateOverride, resetEmailTemplateOverride } from "@/lib/email-templates-store";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return user;
  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return prof?.role === "dorm_admin" ? user : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await params;
  const def = getEmailTemplateDef(key);
  if (!def) return NextResponse.json({ error: "Unknown email template" }, { status: 404 });

  const body = await req.json() as { fields?: Record<string, string> };
  if (!body.fields || typeof body.fields !== "object") {
    return NextResponse.json({ error: "fields object is required" }, { status: 400 });
  }

  // Only persist known fields for this template, trimmed.
  const validKeys = new Set(def.fields.map((f) => f.key));
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.fields)) {
    if (validKeys.has(k) && typeof v === "string") fields[k] = v;
  }

  await saveEmailTemplateOverride(key, fields);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await params;
  if (!getEmailTemplateDef(key)) return NextResponse.json({ error: "Unknown email template" }, { status: 404 });

  await resetEmailTemplateOverride(key);
  return NextResponse.json({ success: true });
}
