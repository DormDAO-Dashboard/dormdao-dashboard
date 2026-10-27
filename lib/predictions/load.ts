import type { Pitch, PricePoint, Quote, Round } from "@/lib/predictions/types";
import { getRepo } from "@/lib/predictions/repo";
import { getHistory, getQuotes } from "@/lib/predictions/quotes";
import { detectAlerts, type PitchAlert } from "@/lib/predictions/alerts";

const DAY_MS = 86_400_000;
// Start charts a few days before the round was published so the entry
// context (where the market was when the team pitched) is visible.
const HISTORY_LEAD_DAYS = 3;

export function historyStart(round: Round | undefined): number {
  if (!round) return Date.now() - 14 * DAY_MS;
  return pitchedAt(round) - HISTORY_LEAD_DAYS * DAY_MS;
}

export function pitchedAt(round: Round | undefined): number {
  if (!round) return 0;
  const [y, m, d] = round.publishedAt.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export interface LoadedPitches {
  pitches: Pitch[];
  quotes: Record<string, Quote | null>;
  histories: Record<string, PricePoint[]>;
  alerts: Record<string, PitchAlert[]>;
}

export async function loadPitches(pitches: Pitch[], rounds: Round[]): Promise<LoadedPitches> {
  const roundByNumber = new Map(rounds.map((w) => [w.number, w]));
  const [quotes, historyEntries] = await Promise.all([
    getQuotes(pitches),
    Promise.all(pitches.map(async (p) =>
      [p.id, await getHistory(p, historyStart(roundByNumber.get(p.roundNumber)))] as const)),
  ]);
  const histories = Object.fromEntries(historyEntries);
  const now = Date.now();
  const alerts = Object.fromEntries(pitches.map((p) => [
    p.id,
    detectAlerts(p, histories[p.id] ?? [], quotes[p.id] ?? null, pitchedAt(roundByNumber.get(p.roundNumber)), now),
  ]));
  return { pitches, quotes, histories, alerts };
}

// Every pitch with its live quote, plus all fills — for fund-wide views.
export async function loadAllWithQuotes() {
  const repo = getRepo();
  const [rounds, pitches, trades] = await Promise.all([repo.listRounds(), repo.listPitches(), repo.listTrades()]);
  const quotes = await getQuotes(pitches);
  return { rounds, pitches, trades, quotes };
}

export async function loadRound(roundNumber?: number) {
  const repo = getRepo();
  const [rounds, allPitches] = await Promise.all([repo.listRounds(), repo.listPitches()]);
  const round = roundNumber === undefined ? rounds[0] : rounds.find((w) => w.number === roundNumber);
  if (!round) return { round: null, rounds, ...(await loadPitches([], rounds)) };
  const pitches = allPitches.filter((p) => p.roundNumber === round.number);
  return { round, rounds, ...(await loadPitches(pitches, rounds)) };
}
