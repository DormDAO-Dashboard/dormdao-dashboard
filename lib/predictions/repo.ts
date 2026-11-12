import type { Pitch, Trade, Round } from "@/lib/predictions/types";
import { SEED_PITCHES, SEED_TRADES, SEED_ROUNDS } from "@/lib/predictions/seed";
import { stakeTrades } from "@/lib/predictions/stake";
import { supabaseRepo } from "@/lib/predictions/supabaseRepo";

// Data access for pages. Pages depend only on this interface, so the
// Supabase-backed implementation replaces the seed one without touching any
// page. PREDICTIONS_SOURCE=supabase switches over once the pm_* tables exist.
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
    return pitchId ? SEED_TRADES.filter((t) => t.pitchId === pitchId) : [...SEED_TRADES];
  },
};

// Adds the assumed $50 stake fills (lib/predictions/stake.ts) to executed
// pitches that have no real fills yet.
function withStakes(repo: PredictionsRepo): PredictionsRepo {
  return {
    ...repo,
    async listTrades(pitchId) {
      const [pitches, rounds, real] = await Promise.all([repo.listPitches(), repo.listRounds(), repo.listTrades()]);
      const all = [...real, ...stakeTrades(pitches, rounds, real)];
      return pitchId ? all.filter((t) => t.pitchId === pitchId) : all;
    },
  };
}

export function getRepo(): PredictionsRepo {
  return withStakes(process.env.PREDICTIONS_SOURCE === "supabase" ? supabaseRepo : seedRepo);
}
