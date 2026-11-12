import type { MarketRef, Pitch, PitchStatus, Round, Sector, Side, Trade, TradeAction, ExitReason, Venue } from "@/lib/predictions/types";
import type { PredictionsRepo } from "@/lib/predictions/repo";
import { createServiceClient } from "@/lib/supabase/server";

// Supabase-backed PredictionsRepo over the pm_* tables
// (supabase-predictions-migration.sql). Reads use the service client: the
// tables have RLS on with no policies, and every caller has already passed
// the Oregon/admin gate in lib/predictions/access.ts.

// Postgres numeric columns arrive as strings.
type Numeric = string | number;

export interface RoundRow {
  number: number;
  published_at: string;
  medium_url: string | null;
  summary: string | null;
  selected_pitch_id: string | null;
}

export interface PitchRow {
  id: string;
  round_number: number;
  sector: Sector;
  analyst: string;
  market_title: string;
  outcome_label: string;
  venue: Venue;
  market_source: "polymarket" | "kalshi" | "polymarket_basket" | "manual";
  market_ids: string[];
  side: Side;
  entry_price: Numeric;
  implied_price: Numeric;
  sell_limit: Numeric | null;
  sell_limit_before: string | null;
  stop_loss: Numeric | null;
  exit_by: string | null;
  exit_price: Numeric | null;
  exited_at: string | null;
  thesis: string[];
  status: PitchStatus;
  recorded_votes: number | null;
}

export interface TradeRow {
  id: string;
  pitch_id: string;
  action: TradeAction;
  contracts: Numeric;
  price: Numeric;
  executed_at: string;
  reason: ExitReason | null;
}

const ROUND_COLUMNS = "number, published_at, medium_url, summary, selected_pitch_id";
const PITCH_COLUMNS = "id, round_number, sector, analyst, market_title, outcome_label, venue, market_source, market_ids, side, entry_price, implied_price, sell_limit, sell_limit_before, stop_loss, exit_by, exit_price, exited_at, thesis, status, recorded_votes";
const TRADE_COLUMNS = "id, pitch_id, action, contracts, price, executed_at, reason";

const num = (value: Numeric) => Number(value);
const numOrNull = (value: Numeric | null) => (value === null ? null : Number(value));

function marketFromRow(row: Pick<PitchRow, "id" | "market_source" | "market_ids">): MarketRef {
  const ids = row.market_ids;
  const bad = () => new Error(`pm_pitches ${row.id}: ${row.market_source} market with ${ids.length} id(s)`);
  switch (row.market_source) {
    case "manual": return { source: "manual" };
    case "polymarket_basket":
      if (ids.length < 2) throw bad();
      return { source: "polymarket_basket", slugs: ids };
    case "polymarket":
      if (ids.length !== 1) throw bad();
      return { source: "polymarket", slug: ids[0] };
    case "kalshi":
      if (ids.length !== 1) throw bad();
      return { source: "kalshi", ticker: ids[0] };
  }
}

export function roundFromRow(row: RoundRow): Round {
  return {
    number: row.number,
    publishedAt: row.published_at,
    mediumUrl: row.medium_url,
    summary: row.summary,
    selectedPitchId: row.selected_pitch_id,
  };
}

export function pitchFromRow(row: PitchRow): Pitch {
  return {
    id: row.id,
    roundNumber: row.round_number,
    sector: row.sector,
    analyst: row.analyst,
    marketTitle: row.market_title,
    outcomeLabel: row.outcome_label,
    venue: row.venue,
    market: marketFromRow(row),
    side: row.side,
    entryPrice: num(row.entry_price),
    impliedPrice: num(row.implied_price),
    sellLimit: numOrNull(row.sell_limit),
    sellLimitBefore: row.sell_limit_before,
    stopLoss: numOrNull(row.stop_loss),
    exitBy: row.exit_by,
    exitPrice: numOrNull(row.exit_price),
    exitedAt: row.exited_at,
    thesis: row.thesis,
    status: row.status,
    votes: row.recorded_votes,
  };
}

export function tradeFromRow(row: TradeRow): Trade {
  return {
    id: row.id,
    pitchId: row.pitch_id,
    action: row.action,
    contracts: num(row.contracts),
    price: num(row.price),
    executedAt: row.executed_at,
    reason: row.reason,
  };
}

function unwrap<T>(table: string, result: { data: T[] | null; error: { message: string } | null }): T[] {
  if (result.error) throw new Error(`[predictions] ${table} query failed: ${result.error.message}`);
  return result.data ?? [];
}

export const supabaseRepo: PredictionsRepo = {
  async listRounds() {
    const result = await createServiceClient().from("pm_rounds").select(ROUND_COLUMNS).order("number", { ascending: false });
    return unwrap<RoundRow>("pm_rounds", result).map(roundFromRow);
  },
  async listPitches() {
    const result = await createServiceClient().from("pm_pitches").select(PITCH_COLUMNS);
    return unwrap<PitchRow>("pm_pitches", result).map(pitchFromRow);
  },
  async getPitch(id) {
    const result = await createServiceClient().from("pm_pitches").select(PITCH_COLUMNS).eq("id", id).limit(1);
    const [row] = unwrap<PitchRow>("pm_pitches", result);
    return row ? pitchFromRow(row) : null;
  },
  async listTrades(pitchId) {
    const query = createServiceClient().from("pm_trades").select(TRADE_COLUMNS).order("executed_at");
    const result = await (pitchId ? query.eq("pitch_id", pitchId) : query);
    return unwrap<TradeRow>("pm_trades", result).map(tradeFromRow);
  },
};
