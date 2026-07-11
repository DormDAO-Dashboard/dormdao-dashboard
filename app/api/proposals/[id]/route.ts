import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Proposal } from "@/lib/proposals";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = createServiceClient();

  const { data: proposal, error } = await service
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const p = proposal as Proposal;
  const total = p.yes_votes + p.no_votes;
  const summary = {
    yes: p.yes_votes,
    no: p.no_votes,
    total,
    pct_yes: total > 0 ? Math.round((p.yes_votes / total) * 100) : null,
  };

  let user_vote: "yes" | "no" | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: vote } = await service
        .from("proposal_votes")
        .select("vote")
        .eq("proposal_id", id)
        .eq("user_id", user.id)
        .single();
      user_vote = (vote?.vote as "yes" | "no") ?? null;
    }
  } catch {
    // Auth check is best-effort
  }

  return NextResponse.json({ proposal: { ...p, user_vote }, summary });
}
