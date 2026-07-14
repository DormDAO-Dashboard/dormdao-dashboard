"use client";
import { useState } from "react";
import { Check, Clock, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Proposal, deadlineLabel, votePercents, isActive } from "@/lib/proposals";
import type { SchoolColors } from "@/lib/schoolColors";
import { schoolDisplayName } from "@/lib/schoolData";

interface Props {
  proposal: Proposal;
  colors: SchoolColors;
  isMember: boolean;
  isLoggedIn: boolean;
  memberCount: number;
  schoolName: string;
  onVote: (id: string, vote: "yes" | "no") => Promise<void>;
  votingInProgress: boolean;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  passed:   { label: "PASSED",   className: "bg-green-900/40 text-green-400 border border-green-800" },
  rejected: { label: "REJECTED", className: "bg-red-900/40 text-red-400 border border-red-800" },
  expired:  { label: "EXPIRED",  className: "bg-gray-800 text-gray-500 border border-gray-700" },
  active:   { label: "ACTIVE",   className: "bg-blue-900/40 text-blue-400 border border-blue-800" },
};

export function ProposalCard({
  proposal, colors, isMember, isLoggedIn, memberCount, schoolName, onVote, votingInProgress,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const active = isActive(proposal);
  const { yesPct, noPct } = votePercents(proposal.yes_votes, proposal.no_votes);
  const totalVotes = proposal.yes_votes + proposal.no_votes;
  const hasVoted = proposal.user_vote != null;
  const badge = STATUS_BADGE[proposal.status] ?? STATUS_BADGE.active;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: colors.primary }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                ${proposal.token_ticker}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{proposal.token_name}</span>
              {!active && (
                <span className={cn("text-xs px-2 py-0.5 rounded font-medium", badge.className)}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{proposal.title}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1 text-right">
            {proposal.recommended_size_eth != null && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                Buy {proposal.recommended_size_eth} ETH
              </span>
            )}
            {proposal.price_target != null && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                Target ${proposal.price_target.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {proposal.description && (
          <div className="mb-4">
            <p className={cn(
              "text-sm text-gray-600 dark:text-gray-400 leading-relaxed",
              !expanded && "line-clamp-3"
            )}>
              {proposal.description}
            </p>
            {proposal.description.length > 180 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
              >
                {expanded
                  ? <><ChevronUp className="w-3 h-3" /> Show less</>
                  : <><ChevronDown className="w-3 h-3" /> Show more</>}
              </button>
            )}
          </div>
        )}

        {/* Vote tally bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium text-green-600 dark:text-green-400">
              YES {yesPct}% ({proposal.yes_votes})
            </span>
            <span className="font-medium text-red-500">
              NO {noPct}% ({proposal.no_votes})
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${yesPct}%`, backgroundColor: totalVotes === 0 ? "#4b5563" : colors.primary }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${noPct}%`, backgroundColor: totalVotes === 0 ? "#4b5563" : "#ef4444" }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs text-gray-400">
              {totalVotes} of {memberCount > 0 ? memberCount : "?"} {schoolDisplayName(schoolName)} members voted
            </span>
            {active && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {deadlineLabel(proposal.voting_deadline)}
              </span>
            )}
          </div>
        </div>

        {/* Vote buttons — active proposals only */}
        {active && (
          <div className="mt-2">
            {hasVoted ? (
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
                proposal.user_vote === "yes"
                  ? "bg-green-900/30 text-green-400 border border-green-800"
                  : "bg-red-900/30 text-red-400 border border-red-800"
              )}>
                <Check className="w-3.5 h-3.5" />
                You voted {proposal.user_vote?.toUpperCase()}
              </div>
            ) : isMember ? (
              <div className="flex gap-3">
                <button
                  onClick={() => onVote(proposal.id, "yes")}
                  disabled={votingInProgress}
                  style={{ backgroundColor: colors.primary, color: colors.text }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  ✓ Vote Yes
                </button>
                <button
                  onClick={() => onVote(proposal.id, "no")}
                  disabled={votingInProgress}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-red-600 text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  ✗ Vote No
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-3 pointer-events-none opacity-40 select-none">
                  <div className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center border border-gray-600 text-gray-400">
                    ✓ Vote Yes
                  </div>
                  <div className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center border border-gray-600 text-gray-400">
                    ✗ Vote No
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white/95 dark:bg-gray-900/95 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <Lock className="w-3 h-3" />
                    {isLoggedIn
                      ? `Sign in as a ${schoolDisplayName(schoolName)} member to vote`
                      : "Sign in to vote"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proposed by */}
        {proposal.proposed_by_name && (
          <p className="mt-3 text-xs text-gray-400">
            Proposed by {proposal.proposed_by_name}
          </p>
        )}
      </div>
    </div>
  );
}
