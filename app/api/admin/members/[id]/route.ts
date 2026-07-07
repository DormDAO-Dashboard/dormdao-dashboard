import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getMembers, saveMembers } from "@/lib/members-store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const members  = await getMembers();
  const filtered = members.filter((m) => m.id !== id);

  if (filtered.length === members.length) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await saveMembers(filtered);
  return NextResponse.json({ success: true });
}
