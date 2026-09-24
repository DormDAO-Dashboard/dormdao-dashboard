import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { proposalSchoolLabel } from "@/lib/email";
import type { Proposal } from "@/lib/proposals";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return user;
  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return prof?.role === "dorm_admin" ? user : null;
}

// Proposals that passed a vote but haven't been marked executed yet, across
// every school — the pool the admin "Mark Filled" panel (Email Functions)
// picks from. Deliberately admin-only and cross-school: the per-proposal
// "Mark as Executed" button on a school's own Voting tab already covers the
// single-school/club-leadership case, this is the centralized counterpart.
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("proposals")
    .select("*")
    .eq("status", "passed")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const proposals = ((data ?? []) as Proposal[]).map((p) => ({
    ...p,
    schoolLabel: proposalSchoolLabel(p.school),
  }));

  return NextResponse.json({ proposals });
}
