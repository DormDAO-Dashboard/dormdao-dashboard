import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { sendPushNotifications } from "@/lib/push";
import { sendEmailNotifications, sendNewProposalEmail } from "@/lib/email";
import { isAdminUser } from "@/lib/admin-config";
import { SCHOOL_NAMES, schoolDisplayName } from "@/lib/schoolData";
import { TOKEN_META } from "@/lib/tokens";
import type { Proposal } from "@/lib/proposals";

export async function GET(req: NextRequest) {
  const school = req.nextUrl.searchParams.get("school");
  if (!school) {
    return NextResponse.json({ error: "school param required" }, { status: 400 });
  }

  // Auth gate: only members of that school (or admins) may see proposals
  let authedUserId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ proposals: [] });

    const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);
    if (!isAdmin) {
      const service = createServiceClient();
      const { data: profile } = await service
        .from("profiles")
        .select("school")
        .eq("id", user.id)
        .single();

      const userSchoolSlug = profile?.school ? slugify(profile.school) : null;
      if (userSchoolSlug !== school) {
        return NextResponse.json({ error: "Access restricted to school members" }, { status: 403 });
      }
    }
    authedUserId = user.id;
  } catch {
    return NextResponse.json({ proposals: [] });
  }

  const service = createServiceClient();

  const { data: proposals, error } = await service
    .from("proposals")
    .select("*")
    .eq("school", school)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (proposals ?? []) as Proposal[];

  if (authedUserId && rows.length > 0) {
    const ids = rows.map((p) => p.id);
    const { data: votes } = await service
      .from("proposal_votes")
      .select("proposal_id, vote")
      .eq("user_id", authedUserId)
      .in("proposal_id", ids);

    if (votes) {
      const voteMap: Record<string, "yes" | "no"> = {};
      for (const v of votes) voteMap[v.proposal_id] = v.vote;
      return NextResponse.json({
        proposals: rows.map((p) => ({ ...p, user_vote: voteMap[p.id] ?? null })),
      });
    }
  }

  return NextResponse.json({ proposals: rows });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit a proposal" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("display_name, school")
    .eq("id", user.id)
    .single();

  const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);

  if (!isAdmin && !profile?.school) {
    return NextResponse.json({ error: "Set your school on your profile before submitting" }, { status: 403 });
  }

  const body = await req.json() as {
    school?: string;
    token_ticker?: string;
    title?: string;
    description?: string;
    recommended_size_eth?: number;
    price_target?: number;
    document_ids?: string[];
  };

  const { school, token_ticker, title, description, recommended_size_eth, price_target, document_ids } = body;

  if (!school) return NextResponse.json({ error: "school is required" }, { status: 400 });
  if (!isAdmin && slugify(profile?.school ?? "") !== school) {
    return NextResponse.json({ error: "You can only submit proposals for your own school" }, { status: 403 });
  }
  if (!token_ticker?.trim()) return NextResponse.json({ error: "token_ticker is required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "description is required" }, { status: 400 });
  // Always lock to 36 hours from now — ignore any client-supplied deadline
  const deadline = new Date(Date.now() + 36 * 60 * 60 * 1000);

  const ticker = token_ticker.trim().toUpperCase();
  const tokenName = TOKEN_META[ticker]?.name ?? ticker;

  const { data: proposal, error } = await service
    .from("proposals")
    .insert({
      school,
      token_ticker: ticker,
      token_name: tokenName,
      title: title.trim(),
      description: description.trim(),
      proposed_by: user.id,
      proposed_by_name: profile?.display_name || "Anonymous",
      recommended_size_eth,
      price_target: price_target ?? null,
      voting_deadline: deadline.toISOString(),
      document_ids: document_ids ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const created = proposal as Proposal;
  const targetSchoolName = SCHOOL_NAMES.find((name) => slugify(name) === school);
  after(async () => {
    const payload = {
      type: "vote" as const,
      title: `🗳️ New proposal: ${created.token_ticker}`,
      body: `${targetSchoolName ? schoolDisplayName(targetSchoolName) : profile?.school ?? "Your school"} is voting on ${created.token_name}. Cast your vote.`,
      url: `https://dormdao-dashboard.vercel.app/schools/${school}/vote`,
    };
    await sendPushNotifications(payload).catch(console.error);
    await sendEmailNotifications(payload).catch(console.error);
    await sendNewProposalEmail(created).catch(console.error);
  });

  return NextResponse.json({ proposal: created }, { status: 201 });
}
