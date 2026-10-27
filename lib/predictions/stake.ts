import type { Pitch, Round, Trade } from "@/lib/predictions/types";

// The fund currently puts a flat $50 into each round's executed pitch.
export const STAKE_USD = 50;

// Assumed fills: a $50 buy of each round's vote winner at its pitched entry
// price on the round's date, held to resolution. A pitch with any real fill
// recorded is left alone — real data always wins over the assumption.
export function stakeTrades(pitches: Pitch[], rounds: Round[], realTrades: Trade[]): Trade[] {
  const hasRealFills = new Set(realTrades.map((t) => t.pitchId));
  return rounds.flatMap((round) => {
    const pitch = pitches.find((p) => p.id === round.selectedPitchId);
    if (!pitch || hasRealFills.has(pitch.id) || pitch.entryPrice <= 0) return [];
    return [{
      id: `stake-${pitch.id}`,
      pitchId: pitch.id,
      action: "buy" as const,
      contracts: STAKE_USD / pitch.entryPrice,
      price: pitch.entryPrice,
      executedAt: round.publishedAt,
      reason: null,
    }];
  });
}
