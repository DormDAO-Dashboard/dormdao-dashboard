// Domain types for the OBG Prediction Markets tracker.
// Prices are probabilities in [0, 1] (a 36¢ contract = 0.36), matching how
// Polymarket and Kalshi quote them. UI formats them as cents/percent.

// Each round every sector pitches one market; the club votes and only the
// winning pitch is executed with fund money. The other two are tracked as
// paper picks so analyst accuracy covers every pitch.
export type Sector = "economics" | "ai_tech" | "politics";

// Where the team places the trade. Synthesis is a front-end over Polymarket
// and Kalshi, so its odds come from the underlying market (see MarketRef).
export type Venue = "polymarket" | "kalshi" | "synthesis";

export type Side = "YES" | "NO";

// Where live odds are read from.
export type MarketRef =
  | { source: "polymarket"; slug: string }
  | { source: "kalshi"; ticker: string }
  | { source: "manual" };

// Thesis lifecycle: closed once the market resolves or the trade is exited.
export type PitchStatus = "open" | "closed";

// How a pitch relates to the fund, derived from its round's vote.
export type PitchRole = "voting" | "executed" | "paper";

export interface Round {
  number: number;
  publishedAt: string; // ISO date, e.g. "2026-10-14"
  mediumUrl: string | null;
  summary: string | null;
  selectedPitchId: string | null; // vote winner; null while voting is open
}

export interface Pitch {
  id: string;
  roundNumber: number;
  sector: Sector;
  analyst: string;
  marketTitle: string;   // e.g. "US Real GDP Growth in Q3 2026"
  outcomeLabel: string;  // e.g. "Above 3.5%"
  venue: Venue;
  market: MarketRef;
  side: Side;
  entryPrice: number;           // price paid for the chosen side
  impliedPrice: number;         // analyst's fair value for the chosen side
  sellLimit: number | null;
  sellLimitBefore: string | null; // "Sell Limit pre-Oct 25" → "2026-10-25"
  stopLoss: number | null;
  exitBy: string | null;          // mandatory exit date
  thesis: string[];               // paragraphs
  status: PitchStatus;
  votes: number | null; // club votes received; null if not recorded
}

export type TradeAction = "buy" | "sell" | "resolve";
export type ExitReason = "sell_limit" | "stop_loss" | "resolution" | "exit_date" | "manual";

// A real fill. Prices are for the pitch's chosen side.
export interface Trade {
  id: string;
  pitchId: string;
  action: TradeAction;
  contracts: number;
  price: number;
  executedAt: string; // ISO timestamp
  reason: ExitReason | null;
}

// Live/last state of a market, already converted to the pitch's side.
export interface Quote {
  price: number | null;         // current price of the chosen side
  resolved: boolean;
  resolvedPrice: number | null; // 1 = chosen side won, 0 = lost
  closesAt: string | null;
  fetchedAt: string;
}

export interface PricePoint {
  time: number;  // ms epoch
  price: number; // chosen side
}

export const SECTOR_LABEL: Record<Sector, string> = {
  economics: "Economics",
  ai_tech: "AI/Tech",
  politics: "Politics",
};

export const SECTOR_ORDER: Sector[] = ["economics", "ai_tech", "politics"];

export const VENUE_LABEL: Record<Venue, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  synthesis: "Synthesis",
};
