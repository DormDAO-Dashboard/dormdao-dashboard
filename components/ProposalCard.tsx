"use client";
import { useState } from "react";
import { Check, Clock, ChevronDown, ChevronUp, Lock, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Proposal, deadlineLabel, votePercents, isActive } from "@/lib/proposals";
import type { SchoolColors } from "@/lib/schoolColors";
import { schoolDisplayName } from "@/lib/schoolData";

interface Props {
  proposal: Proposal;
  colors: SchoolColors;
  isMember: boolean;
  isLoggedIn: boolean;
  isClubLeader: boolean;
  memberCount: number;
  schoolName: string;
  onVote: (id: string, vote: "yes" | "no") => Promise<void>;
  votingInProgress: boolean;
  onExecuted?: (id: string) => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  passed:   { label: "PASSED",   className: "bg-green-900/40 text-green-400 border border-green-800" },
  rejected: { label: "REJECTED", className: "bg-red-900/40 text-red-400 border border-red-800" },
  expired:  { label: "EXPIRED",  className: "bg-gray-800 text-gray-500 border border-gray-700" },
  active:   { label: "ACTIVE",   className: "bg-blue-900/40 text-blue-400 border border-blue-800" },
  executed: { label: "EXECUTED", className: "bg-purple-900/40 text-purple-400 border border-purple-800" },
};

export function ProposalCard({
  proposal, colors, isMember, isLoggedIn, isClubLeader, memberCount, schoolName, onVote, votingInProgress, onExecuted,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executeTx, setExecuteTx] = useState("");
  const [tradeOutput, setTradeOutput] = useState("");
  const [executeNotes, setExecuteNotes] = useState("");
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);

  const active = isActive(proposal);
  const { yesPct, noPct } = votePercents(proposal.yes_votes, proposal.no_votes);
  const totalVotes = proposal.yes_votes + proposal.no_votes;
  const hasVoted = proposal.user_vote != null;
  const badge = STATUS_BADGE[proposal.status] ?? STATUS_BADGE.active;

  async function handleExecute(e: React.FormEvent) {
    e.preventDefault();
    setExecuteError(null);
    setExecuting(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/execute`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execution_tx: executeTx.trim(),
          trade_output: tradeOutput.trim(),
          execution_notes: executeNotes.trim() || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setExecuteError(data.error ?? "Failed to mark as executed");
        return;
      }
      setShowExecuteModal(false);
      onExecuted?.(proposal.id);
    } catch {
      setExecuteError("Network error — please try again");
    } finally {
      setExecuting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <>
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

          {/* Execution details */}
          {proposal.status === "executed" && proposal.execution_tx && (
            <div className="mb-4 rounded-lg bg-purple-900/10 border border-purple-800/30 px-4 py-3 space-y-1">
              <a
                href={proposal.execution_tx}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                View on Etherscan
              </a>
              {proposal.execution_notes && (
                <p className="text-xs text-gray-400">{proposal.execution_notes}</p>
              )}
              {proposal.executed_at && (
                <p className="text-xs text-gray-600">
                  Executed {new Date(proposal.executed_at).toLocaleDateString()}
                </p>
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

          {/* Vote buttons */}
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

          {/* Mark as Executed */}
          {proposal.status === "passed" && isClubLeader && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => { setShowExecuteModal(true); setExecuteError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-900/20 border border-purple-800/40 text-purple-400 hover:bg-purple-900/30 transition-colors"
              >
                ✓ Mark as Executed
              </button>
            </div>
          )}

          {proposal.proposed_by_name && (
            <p className="mt-3 text-xs text-gray-400">
              Proposed by {proposal.proposed_by_name}
            </p>
          )}
        </div>
      </div>

      {showExecuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExecuteModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-purple-500" />
            <form onSubmit={handleExecute} className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Mark as Executed</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">${proposal.token_ticker}</span>
                  {" — "}{proposal.title}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Etherscan TX Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={executeTx}
                  onChange={(e) => setExecuteTx(e.target.value)}
                  placeholder="https://etherscan.io/tx/0x…"
                  required
                  className={inputClass + " font-mono text-xs"}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Trade Output <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tradeOutput}
                  onChange={(e) => setTradeOutput(e.target.value)}
                  placeholder="e.g. Bought 500 HYPE at $4.20 avg"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={executeNotes}
                  onChange={(e) => setExecuteNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Any additional context…"
                  className={inputClass + " resize-none"}
                />
              </div>

              {executeError && (
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {executeError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExecuteModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={executing}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-purple-900/30 border border-purple-800/50 text-purple-300 hover:bg-purple-900/50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {executing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Execution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
