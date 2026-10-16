import { createServiceClient } from "@/lib/supabase/server";
import { sendPushNotifications } from "@/lib/push";
import { sendProposalResultEmail, sendNewProposalEmail, proposalSchoolLabel, proposalVoteUrl } from "@/lib/email";
import { slugify } from "@/lib/utils";
import { SCHOOL_NAMES, schoolDisplayName } from "@/lib/schoolData";
import { MAIN_DAO_SLUG } from "@/lib/main-dao";
import type { Proposal } from "@/lib/proposals";

type ServiceClient = ReturnType<typeof createServiceClient>;

// Resolves every active proposal whose voting deadline has passed, and
// reposts passed school proposals to Main DAO as a new proposal.
//
// This used to live only inside the /api/snapshot cron, behind its 50-minute
// cooldown early-return — so a school vote that passed could sit unresolved
// (and unreposted) until the next external cron-job.org run that happened to
// clear the cooldown, i.e. hours later. It's now called from the cron
// unconditionally (before the cooldown check) AND from the proposals GET
// route, so a proposal resolves the moment anyone loads a voting page after
// its deadline.
//
// Safe to call concurrently from many requests: each proposal is claimed with
// a conditional `status = 'active'` update, so only one caller ever wins it
// and reposts. If the Main DAO repost insert fails, the claim is rolled back
// to "active" so the next call retries, instead of leaving a passed proposal
// permanently unreposted.
export async function resolveExpiredProposals(supabase: ServiceClient): Promise<void> {
  const { data: expiredProposals, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("status", "active")
    .lt("voting_deadline", new Date().toISOString());

  if (error) {
    console.error("[resolve-proposals] failed to load expired proposals:", error.message);
    return;
  }
  if (!expiredProposals || expiredProposals.length === 0) return;

  for (const proposal of expiredProposals as Proposal[]) {
    try {
      await resolveOne(supabase, proposal);
    } catch (err) {
      console.error(`[resolve-proposals] failed to resolve proposal ${proposal.id}:`, err);
    }
  }
}

async function resolveOne(supabase: ServiceClient, proposal: Proposal): Promise<void> {
  // "Passed" means at least 50% YES — not a strict majority, so an exact tie
  // (e.g. 1 yes / 1 no) still passes and reposts to Main DAO. A proposal with
  // zero votes cast stays "rejected" rather than auto-passing on an empty 0/0
  // split.
  const totalVotes = proposal.yes_votes + proposal.no_votes;
  const resolvedStatus = totalVotes > 0 && proposal.yes_votes / totalVotes >= 0.5 ? "passed" : "rejected";

  // Atomic claim — a concurrent caller that already resolved this proposal
  // leaves zero rows matching status = 'active', so we bail without
  // double-emailing or double-reposting.
  const { data: claimed, error: claimError } = await supabase
    .from("proposals")
    .update({ status: resolvedStatus })
    .eq("id", proposal.id)
    .eq("status", "active")
    .select("id");
  if (claimError) throw new Error(claimError.message);
  if (!claimed || claimed.length === 0) return;

  const resolved = { ...proposal, status: resolvedStatus } as Proposal;

  // Repost passed school proposals to Main DAO as a new proposal. Guard
  // against Main DAO proposals reposting themselves.
  if (resolvedStatus === "passed" && resolved.school !== MAIN_DAO_SLUG) {
    const originSchoolName = SCHOOL_NAMES.find((name) => slugify(name) === resolved.school);
    const originLabel = originSchoolName ? schoolDisplayName(originSchoolName) : resolved.school;
    const mainDaoDeadline = new Date(Date.now() + 36 * 60 * 60 * 1000);

    const { data: repostedRow, error: repostError } = await supabase
      .from("proposals")
      .insert({
        school: MAIN_DAO_SLUG,
        token_ticker: resolved.token_ticker,
        token_name: resolved.token_name,
        title: `${originLabel}: ${resolved.title}`,
        description: resolved.description,
        proposed_by: resolved.proposed_by,
        proposed_by_name: resolved.proposed_by_name,
        recommended_size_eth: resolved.recommended_size_eth,
        price_target: resolved.price_target,
        document_ids: resolved.document_ids ?? [],
        voting_deadline: mainDaoDeadline.toISOString(),
        created_by_admin: true,
        // Snapshot of the school-level vote tally this pitch passed with —
        // shown as "Original Vote" on the Main DAO card (see
        // ProposalCard.tsx), immutable from here on.
        origin_yes_votes: resolved.yes_votes,
        origin_no_votes: resolved.no_votes,
      })
      .select()
      .single();

    if (repostError) {
      // Roll the claim back so the next call retries the repost.
      await supabase.from("proposals").update({ status: "active" }).eq("id", proposal.id).eq("status", "passed");
      throw new Error(`repost to Main DAO failed: ${repostError.message}`);
    }

    console.log(`[resolve-proposals] reposted proposal ${resolved.id} to Main DAO`);
    const reposted = repostedRow as Proposal;
    await sendPushNotifications({
      type: "vote" as const,
      title: `🗳️ New proposal: ${reposted.token_ticker}`,
      body: `${proposalSchoolLabel(MAIN_DAO_SLUG)} is voting on ${reposted.token_name}. Cast your vote.`,
      url: proposalVoteUrl(MAIN_DAO_SLUG),
    }).catch(console.error);
    await sendNewProposalEmail(reposted).catch(console.error);
  }

  await sendProposalResultEmail(resolved).catch(console.error);
}
