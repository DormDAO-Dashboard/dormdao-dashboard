import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { isAdminUser } from "@/lib/admin-config";
import { MAIN_DAO_SLUG, isMainDaoAuthorized } from "@/lib/main-dao";
import { isActive } from "@/lib/proposals";
import type { Proposal } from "@/lib/proposals";

// Returns who voted on a proposal. Vote choice is withheld while the
// proposal is still active (same confidentiality as the voting UI) and
// included once it's closed — same rule the result email already applies.
// Access is gated the same way as GET /api/proposals (school members + admins).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view voters" }, { status: 401 });

  const service = createServiceClient();

  const { data: proposal } = await service
    .from("proposals")
    .select("id, school, status, voting_deadline")
    .eq("id", id)
    .single();

  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  const p = proposal as Pick<Proposal, "id" | "school" | "status" | "voting_deadline">;
  const proposalActive = isActive(p as Proposal);

  const { data: profile } = await service
    .from("profiles")
    .select("school, role")
    .eq("id", user.id)
    .single();

  // Must include profiles.role === "dorm_admin", not just the env-configured
  // ADMIN_EMAIL/ADMIN_EMAILS — otherwise a promoted admin outside that env
  // list gets treated as a regular member here (see GET /api/proposals).
  const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)
    || profile?.role === "dorm_admin";
  if (p.school === MAIN_DAO_SLUG) {
    if (!isMainDaoAuthorized(isAdmin, profile?.role, profile?.school)) {
      return NextResponse.json({ error: "Access restricted to Dorm™ admins and Main DAO voters" }, { status: 403 });
    }
  } else if (!isAdmin) {
    const userSchoolSlug = profile?.school ? slugify(profile.school) : null;
    if (userSchoolSlug !== p.school) {
      return NextResponse.json({ error: "Access restricted to school members" }, { status: 403 });
    }
  }

  const { data: votes, error } = await service
    .from("proposal_votes")
    .select("user_id, vote")
    .eq("proposal_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const voteByUserId = new Map((votes ?? []).map((v) => [v.user_id as string, v.vote as "yes" | "no"]));
  const userIds = Array.from(voteByUserId.keys());
  if (userIds.length === 0) return NextResponse.json({ voters: [] });

  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  // Vote choice is only attached to the response once the proposal is no
  // longer active — while voting is open it never leaves this route.
  const voters = (profiles ?? [])
    .map((row) => {
      const id = row.id as string;
      const display_name = (row.display_name as string | null) ?? "Anonymous";
      return proposalActive ? { id, display_name } : { id, display_name, vote: voteByUserId.get(id) };
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json({ voters });
}
