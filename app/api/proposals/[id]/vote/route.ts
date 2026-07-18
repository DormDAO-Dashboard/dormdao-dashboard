import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { isAdminUser } from "@/lib/admin-config";
import { MAIN_DAO_SLUG, isMainDaoAuthorized } from "@/lib/main-dao";
import type { Proposal, VoteChoice } from "@/lib/proposals";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to vote" }, { status: 401 });

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("school, role")
    .eq("id", user.id)
    .single();

  const { data: proposal } = await service
    .from("proposals")
    .select("id, school, status, voting_deadline")
    .eq("id", id)
    .single();

  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

  const p = proposal as Pick<Proposal, "id" | "school" | "status" | "voting_deadline">;

  if (p.school === MAIN_DAO_SLUG) {
    const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);
    if (!isMainDaoAuthorized(isAdmin, profile?.role)) {
      return NextResponse.json({ error: "Only DormDAO admins can vote on Main DAO proposals" }, { status: 403 });
    }
  } else {
    if (!profile?.school) {
      return NextResponse.json({ error: "Set your school on your profile before voting" }, { status: 403 });
    }
    if (slugify(profile.school) !== p.school) {
      return NextResponse.json({ error: "You can only vote on your own school's proposals" }, { status: 403 });
    }
  }

  if (p.status !== "active") {
    return NextResponse.json({ error: "This proposal is no longer active" }, { status: 409 });
  }

  if (new Date(p.voting_deadline) <= new Date()) {
    return NextResponse.json({ error: "Voting deadline has passed" }, { status: 409 });
  }

  const body = await req.json() as { vote?: string };
  const vote = body.vote as VoteChoice;
  if (vote !== "yes" && vote !== "no") {
    return NextResponse.json({ error: "vote must be 'yes' or 'no'" }, { status: 400 });
  }

  // Check for existing vote before calling RPC
  const { data: existing } = await service
    .from("proposal_votes")
    .select("id")
    .eq("proposal_id", id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "You have already voted on this proposal" }, { status: 409 });
  }

  // Atomic insert + counter increment via SECURITY DEFINER RPC
  const { error: rpcError } = await service.rpc("cast_proposal_vote", {
    p_proposal_id: id,
    p_user_id: user.id,
    p_vote: vote,
  });

  if (rpcError) {
    if (rpcError.code === "23505") {
      return NextResponse.json({ error: "You have already voted on this proposal" }, { status: 409 });
    }
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, vote });
}
