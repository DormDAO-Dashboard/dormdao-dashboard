"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { slugify, cn } from "@/lib/utils";
import { getSchoolColors } from "@/lib/schoolColors";
import { type Proposal, isActive } from "@/lib/proposals";
import { schoolDisplayName } from "@/lib/schoolData";
import { ProposalCard } from "@/components/ProposalCard";
import { NewProposalModal } from "@/components/NewProposalModal";
import type { User } from "@supabase/supabase-js";

interface Props {
  slug: string;
  schoolName: string;
  pageMode?: boolean;
}

export function VotingClient({ slug, schoolName, pageMode = false }: Props) {
  const colors = getSchoolColors(slug);

  const [user, setUser] = useState<User | null>(null);
  const [userSchoolSlug, setUserSchoolSlug] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");
  const [showModal, setShowModal] = useState(false);
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isMember = !!user && userSchoolSlug === slug;
  const isLoggedIn = !!user;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const fetchProposals = useCallback(async () => {
    const res = await fetch(`/api/proposals?school=${slug}`);
    if (!res.ok) return;
    const data = await res.json() as { proposals: Proposal[] };
    setProposals(data.proposals ?? []);
  }, [slug]);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      setLoading(true);
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        setUser(u ?? null);

        if (u) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("school")
            .eq("id", u.id)
            .single();
          setUserSchoolSlug(profile?.school ? slugify(profile.school) : null);
        }

        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("school", schoolName);
        setMemberCount(count ?? 0);

        await fetchProposals();
      } finally {
        setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserSchoolSlug(null);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("school")
          .eq("id", session.user.id)
          .single();
        setUserSchoolSlug(profile?.school ? slugify(profile.school) : null);
      }
      await fetchProposals();
    });

    return () => subscription.unsubscribe();
  }, [slug, schoolName, fetchProposals]);

  async function handleVote(proposalId: string, vote: "yes" | "no") {
    setVotingFor(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Vote failed");
        return;
      }
      setProposals((prev) =>
        prev.map((p) =>
          p.id !== proposalId
            ? p
            : {
                ...p,
                user_vote: vote,
                yes_votes: vote === "yes" ? p.yes_votes + 1 : p.yes_votes,
                no_votes:  vote === "no"  ? p.no_votes  + 1 : p.no_votes,
              }
        )
      );
      showToast(`Voted ${vote.toUpperCase()} — vote recorded`);
    } catch {
      showToast("Network error — please try again");
    } finally {
      setVotingFor(null);
    }
  }

  function handleCreated(proposal: Proposal) {
    setProposals((prev) => [proposal, ...prev]);
    setShowModal(false);
    showToast("Proposal submitted successfully");
  }

  const activeProposals = proposals.filter(isActive);
  const pastProposals   = proposals.filter((p) => !isActive(p));

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-800 h-48 animate-pulse bg-gray-100 dark:bg-gray-900/50"
          />
        ))}
      </div>
    );
  }

  if (pageMode && user && !isMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          🗳️
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Members Only</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          This voting page is for {schoolDisplayName(schoolName)} members only.
        </p>
      </div>
    );
  }

  const displayProposals = activeTab === "active" ? activeProposals : pastProposals;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-800">
          {(["active", "past"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                activeTab === tab ? "font-medium" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              style={activeTab === tab ? { borderColor: colors.primary, color: colors.primary } : {}}
            >
              {tab === "active" ? `Active (${activeProposals.length})` : `Past (${pastProposals.length})`}
            </button>
          ))}
        </div>

        {isMember && (
          <button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: colors.primary, color: colors.text }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Proposal
          </button>
        )}
      </div>

      {displayProposals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {activeTab === "active" ? "No active proposals right now." : "No past proposals yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {displayProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              colors={colors}
              isMember={isMember}
              isLoggedIn={isLoggedIn}
              memberCount={memberCount}
              schoolName={schoolName}
              onVote={handleVote}
              votingInProgress={votingFor === proposal.id}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewProposalModal
          slug={slug}
          colors={colors}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {toastMsg && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
