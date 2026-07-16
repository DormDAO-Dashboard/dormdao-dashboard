import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getMembers, saveMembers, type MemberRole } from "@/lib/members-store";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    email?: string;
    walletAddress?: string;
    school?: string | null;
    role?: string;
  };

  const VALID_ROLES: MemberRole[] = ['member', 'club_admin', 'director', 'president'];
  const members = await getMembers();
  const idx = members.findIndex((m) => m.id === id);
  if (idx === -1) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const updated = {
    ...members[idx],
    ...(body.name        !== undefined && { name: body.name.trim() }),
    ...(body.email       !== undefined && { email: body.email.trim() }),
    ...(body.walletAddress !== undefined && { walletAddress: body.walletAddress.trim() }),
    ...(body.school      !== undefined && { school: body.school?.trim() || null }),
    ...(body.role        !== undefined && { role: VALID_ROLES.includes(body.role as MemberRole) ? (body.role as MemberRole) : members[idx].role }),
  };

  const newList = [...members.slice(0, idx), updated, ...members.slice(idx + 1)];
  await saveMembers(newList);

  // Sync to live profile if the member has already logged in
  if (updated.email) {
    const service = createServiceClient();
    const { data: authUser } = await service.auth.admin.listUsers();
    const matched = authUser?.users?.find(
      (u) => u.email?.toLowerCase() === updated.email.toLowerCase()
    );
    if (matched) {
      await service.from("profiles").update({
        school: updated.school ?? null,
        role: updated.role,
      }).eq("id", matched.id);
    }
  }

  return NextResponse.json({ member: updated });
}
