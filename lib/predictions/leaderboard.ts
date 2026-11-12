import type { Pitch, Quote, Trade, Round } from "@/lib/predictions/types";
import { isPitchClosed, markPrice, pitchMark, returnPct, summarizePosition } from "@/lib/predictions/math";

// "club" puts every pitch in one row — a school's overall record.
export type LeaderboardGroup = "analyst" | "sector" | "club";

export interface LeaderboardRow {
  key: string;
  picks: number;
  selected: number;        // pitches that won the club vote
  closed: number;
  wins: number;
  hitRate: number | null;   // % of closed picks (executed + paper) marked above entry
  avgReturn: number | null; // mean % return across priced picks (mark-to-market)
  pnlUsd: number;
}

export function buildLeaderboard(
  pitches: Pitch[],
  quotes: Record<string, Quote | null>,
  trades: Trade[],
  rounds: Round[],
  group: LeaderboardGroup,
): LeaderboardRow[] {
  const keyOf = (p: Pitch) => (group === "club" ? "club" : group === "analyst" ? p.analyst : p.sector);
  const keys = [...new Set(pitches.map(keyOf))];
  const selectedIds = new Set(rounds.flatMap((w) => (w.selectedPitchId ? [w.selectedPitchId] : [])));

  const rows = keys.map((key): LeaderboardRow => {
    const mine = pitches.filter((p) => keyOf(p) === key);
    const scored = mine.map((p) => {
      const quote = quotes[p.id] ?? null;
      const mark = pitchMark(p, quote);
      return {
        closed: isPitchClosed(p, quote),
        ret: mark === null ? null : returnPct(p.entryPrice, mark),
        // Open contracts are marked live; exited ones already sold.
        pnl: summarizePosition(trades.filter((t) => t.pitchId === p.id), markPrice(quote)).totalPnl,
      };
    });
    const closed = scored.filter((s) => s.closed);
    const wins = closed.filter((s) => s.ret !== null && s.ret > 0).length;
    const priced = scored.flatMap((s) => (s.ret === null ? [] : [s.ret]));

    return {
      key,
      picks: mine.length,
      selected: mine.filter((p) => selectedIds.has(p.id)).length,
      closed: closed.length,
      wins,
      hitRate: closed.length > 0 ? (wins / closed.length) * 100 : null,
      avgReturn: priced.length > 0 ? priced.reduce((a, b) => a + b, 0) / priced.length : null,
      pnlUsd: scored.reduce((sum, s) => sum + s.pnl, 0),
    };
  });

  return rows.sort((a, b) => (b.avgReturn ?? -Infinity) - (a.avgReturn ?? -Infinity));
}
