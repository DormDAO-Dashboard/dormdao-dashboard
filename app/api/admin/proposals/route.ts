import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { proposalSchoolLabel } from "@/lib/email";
import { MAIN_DAO_SLUG } from "@/lib/main-dao";
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

// Proposals for the admin "Trade Executed" box (Email Functions), across
// every real school. Deliberately admin-only and cross-school: the
// per-proposal "Mark as Executed" button on a school's own Voting tab
// already covers the single-school/club-leadership case, this is the
// centralized counterpart. ?status=passed (default) — awaiting fill, the
// pool that box's list picks from. ?status=executed — already filled, for
// "View Filled Proposals". Main DAO proposals are excluded from both — the
// Trade Executed email is a per-school notification, so Main DAO never
// belongs in this box at all (enforced again, server-side, in
// app/api/proposals/[id]/execute regardless of what calls it).
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") === "executed" ? "executed" : "passed";

  const service = createServiceClient();
  const { data, error } = await service
    .from("proposals")
    .select("*")
    .eq("status", status)
    .neq("school", MAIN_DAO_SLUG)
    .order(status === "executed" ? "executed_at" : "created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const proposals = ((data ?? []) as Proposal[]).map((p) => ({
    ...p,
    schoolLabel: proposalSchoolLabel(p.school),
  }));

  return NextResponse.json({ proposals });
}
