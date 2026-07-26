import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { EMAIL_TEMPLATES } from "@/lib/email-templates";
import { getEmailTemplateOverrides } from "@/lib/email-templates-store";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return user;
  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return prof?.role === "dorm_admin" ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const overrides = await getEmailTemplateOverrides();

  const templates = EMAIL_TEMPLATES.map((def) => {
    const override = overrides[def.key] ?? {};
    return {
      key: def.key,
      label: def.label,
      trigger: def.trigger,
      variables: def.variables,
      sampleVars: def.sampleVars,
      fields: def.fields.map((f) => ({
        key: f.key,
        label: f.label,
        multiline: f.multiline ?? false,
        default: f.default,
        value: override[f.key] ?? f.default,
      })),
      isOverridden: Object.keys(override).length > 0,
    };
  });

  return NextResponse.json({ templates });
}
