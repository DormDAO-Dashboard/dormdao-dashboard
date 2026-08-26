import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { SCHOOL_NAMES } from "@/lib/schoolData";

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
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { display_name?: string; school?: string | null };

  const update: Record<string, string | null> = {};
  if (body.display_name !== undefined) update.display_name = body.display_name.trim() || null;
  if (body.school !== undefined) {
    const s = body.school?.trim() || null;
    if (s && !(SCHOOL_NAMES as readonly string[]).includes(s)) {
      return NextResponse.json({ error: "Invalid school" }, { status: 400 });
    }
    update.school = s;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from("profiles").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// Revoke dorm_admin status, dropping the profile back to a regular member.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requester = await requireAdmin();
  if (!requester) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (id === requester.id) {
    return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from("profiles").update({ role: "member" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
