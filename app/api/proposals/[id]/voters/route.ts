import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { isAdminUser } from "@/lib/admin-config";
import { MAIN_DAO_SLUG, isMainDaoAuthorized } from "@/lib/main-dao";
import type { Proposal } from "@/lib/proposals";

// Returns who voted on a proposal, never how they voted — only member names,
// gated by the same access rule as GET /api/proposals (school members + admins).
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
    .select("id, school")
    .eq("id", id)
    .single();

  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  const p = proposal as Pick<Proposal, "id" | "school">;

  const { data: profile } = await service
    .from("profiles")
    .select("school, role")
    .eq("id", user.id)
    .single();

  const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);
  if (p.school === MAIN_DAO_SLUG) {
    if (!isMainDaoAuthorized(isAdmin, profile?.role, profile?.school)) {
      return NextResponse.json({ error: "Access restricted to DormDAO admins and Main DAO voters" }, { status: 403 });
    }
  } else if (!isAdmin) {
    const userSchoolSlug = profile?.school ? slugify(profile.school) : null;
    if (userSchoolSlug !== p.school) {
      return NextResponse.json({ error: "Access restricted to school members" }, { status: 403 });
    }
  }

  // Deliberately select only user_id — vote choice must never leave this route.
  const { data: votes, error } = await service
    .from("proposal_votes")
    .select("user_id")
    .eq("proposal_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((votes ?? []).map((v) => v.user_id as string)));
  if (userIds.length === 0) return NextResponse.json({ voters: [] });

  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  const voters = (profiles ?? [])
    .map((row) => ({ id: row.id as string, display_name: (row.display_name as string | null) ?? "Anonymous" }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json({ voters });
}
