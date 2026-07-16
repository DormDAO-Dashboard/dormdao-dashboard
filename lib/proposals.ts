export interface Proposal {
  id: string;
  created_at: string;
  school: string; // slug, e.g. "oregon"
  token_ticker: string;
  token_name: string;
  title: string;
  description: string | null;
  proposed_by: string | null;
  proposed_by_name: string | null;
  status: "active" | "passed" | "rejected" | "expired" | "executed";
  recommended_size_eth: number | null;
  price_target: number | null;
  voting_deadline: string;
  yes_votes: number;
  no_votes: number;
  created_by_admin: boolean;
  document_ids: string[] | null;
  execution_tx: string | null;
  execution_notes: string | null;
  executed_at: string | null;
  deadline_warning_sent: boolean;
  user_vote?: "yes" | "no" | null;
}

export type VoteChoice = "yes" | "no";
export type ProposalStatus = Proposal["status"];

export function isActive(p: Proposal): boolean {
  return p.status === "active" && new Date(p.voting_deadline) > new Date();
}

export function deadlineLabel(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Closed";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "< 1h remaining";
  if (hours < 24) return `${hours}h remaining`;
  const days = Math.floor(hours / 24);
  return `${days}d remaining`;
}

export function votePercents(yes: number, no: number): { yesPct: number; noPct: number } {
  const total = yes + no;
  if (total === 0) return { yesPct: 50, noPct: 50 };
  return {
    yesPct: Math.round((yes / total) * 100),
    noPct:  Math.round((no  / total) * 100),
  };
}
