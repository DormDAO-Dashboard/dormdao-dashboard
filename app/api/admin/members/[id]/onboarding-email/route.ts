import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getMembers } from "@/lib/members-store";
import { sendInviteEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) {
    const svc = createServiceClient();
    const { data: pf } = await svc.from("profiles").select("role").eq("id", user.id).single();
    if (pf?.role !== "dorm_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const members = await getMembers();
  const member = members.find((m) => m.id === id);
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (!member.email) return NextResponse.json({ error: "Member has no email on file" }, { status: 400 });
  if (!member.school) return NextResponse.json({ error: "Member has no school on file" }, { status: 400 });

  await sendInviteEmail({
    to: member.email,
    name: member.name,
    school: member.school,
    invitedBy: user.user_metadata?.full_name as string | undefined,
  });

  return NextResponse.json({ success: true });
}
