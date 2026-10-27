import type { Pitch, Trade, Round } from "@/lib/predictions/types";
import { SEED_PITCHES, SEED_TRADES, SEED_ROUNDS } from "@/lib/predictions/seed";
import { stakeTrades } from "@/lib/predictions/stake";

// Data access for pages. Pages depend only on this interface, so the
// Supabase-backed implementation can replace the seed one without touching
// any page (and the whole module ports into the DormDAO repo as-is).
export interface PredictionsRepo {
  listRounds(): Promise<Round[]>;
  listPitches(): Promise<Pitch[]>;
  getPitch(id: string): Promise<Pitch | null>;
  listTrades(pitchId?: string): Promise<Trade[]>;
}

const seedRepo: PredictionsRepo = {
  async listRounds() {
    return [...SEED_ROUNDS].sort((a, b) => b.number - a.number);
  },
  async listPitches() {
    return [...SEED_PITCHES];
  },
  async getPitch(id) {
    return SEED_PITCHES.find((p) => p.id === id) ?? null;
  },
  async listTrades(pitchId) {
    const all = [...SEED_TRADES, ...stakeTrades(SEED_PITCHES, SEED_ROUNDS, SEED_TRADES)];
    return pitchId ? all.filter((t) => t.pitchId === pitchId) : all;
  },
};

export function getRepo(): PredictionsRepo {
  return seedRepo;
}
