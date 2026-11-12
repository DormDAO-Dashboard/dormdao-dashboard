import { loadAllWithQuotes } from "@/lib/predictions/load";
import { buildLeaderboard } from "@/lib/predictions/leaderboard";
import { PREDICTION_SCHOOLS } from "@/lib/predictions/schools";
import { slugify } from "@/lib/utils";

export interface PredictionSchoolRecord {
  name: string;
  slug: string;
  pitches: number;
  selected: number;
  hitRate: number | null;
  wins: number;
  closed: number;
  avgReturn: number | null;
  pnlUsd: number;
}

// Each school's overall record, best average return first. Pitches/trades
// have no school field yet, so every pitch counts as Oregon's.
export async function loadSchoolRecords(): Promise<PredictionSchoolRecord[]> {
  const { rounds, pitches, trades, quotes } = await loadAllWithQuotes();
  const record = buildLeaderboard(pitches, quotes, trades, rounds, "club")[0] ?? null;

  return PREDICTION_SCHOOLS.map((name) => ({
    name,
    slug: slugify(name),
    pitches: record?.picks ?? 0,
    selected: record?.selected ?? 0,
    hitRate: record?.hitRate ?? null,
    wins: record?.wins ?? 0,
    closed: record?.closed ?? 0,
    avgReturn: record?.avgReturn ?? null,
    pnlUsd: record?.pnlUsd ?? 0,
  })).sort((a, b) => (b.avgReturn ?? -Infinity) - (a.avgReturn ?? -Infinity));
}
