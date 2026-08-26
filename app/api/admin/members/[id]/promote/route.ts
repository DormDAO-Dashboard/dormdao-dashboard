import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getMembers } from "@/lib/members-store";

async function requireSiteAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return user;
  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return prof?.role === "dorm_admin" ? user : null;
}

// Site-wide admin status lives on profiles.role, keyed by Supabase auth user
// id — not on the members.json role field (that's club-level: member/
// club_admin/director/president). We match the member to their auth account
// by email, so they must have signed in at least once first.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSiteAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const members = await getMembers();
  const member = members.find((m) => m.id === id);
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (!member.email) {
    return NextResponse.json({ error: "This member has no email on file — add one before promoting." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 1000 });
  const matched = authUsers?.users?.find((u) => u.email?.toLowerCase() === member.email.toLowerCase());
  if (!matched) {
    return NextResponse.json(
      { error: "This member hasn't signed in yet. They need to log in at least once before they can be promoted to admin." },
      { status: 400 },
    );
  }

  const { error } = await service.from("profiles").upsert(
    { id: matched.id, display_name: member.name, school: member.school, role: "dorm_admin" },
    { onConflict: "id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
