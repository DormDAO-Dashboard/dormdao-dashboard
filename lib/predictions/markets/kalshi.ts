import type { PricePoint } from "@/lib/predictions/types";
import { getJson, toNumber, type YesQuote } from "@/lib/predictions/markets/http";

const API = "https://api.elections.kalshi.com/trade-api/v2";
const QUOTE_REVALIDATE_S = 60;
const HISTORY_REVALIDATE_S = 600;
const HOUR_MINUTES = 60;
const DAY_MINUTES = 1440;

interface KalshiMarket {
  ticker: string;
  status: string;
  result: string; // "yes" | "no" | "" while open
  last_price_dollars?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  close_time?: string;
}

interface Candle {
  end_period_ts: number;
  price?: { close_dollars?: string | null };
  yes_bid?: { close_dollars?: string | null };
  yes_ask?: { close_dollars?: string | null };
}

function midpoint(bid: number | null, ask: number | null): number | null {
  if (bid === null || ask === null || ask <= 0) return null;
  return (bid + ask) / 2;
}

// Market tickers look like SERIES-EVENT-STRIKE (KXGDP-26OCT30-T3.5);
// the candlestick endpoint is keyed by the series prefix.
function seriesOf(ticker: string): string {
  return ticker.split("-")[0];
}

export async function fetchKalshiYes(ticker: string): Promise<YesQuote | null> {
  const data = await getJson<{ market?: KalshiMarket }>(
    `${API}/markets/${encodeURIComponent(ticker)}`,
    QUOTE_REVALIDATE_S,
  );
  const m = data?.market;
  if (!m) return null;

  const resolvedYes = m.result === "yes" ? 1 : m.result === "no" ? 0 : null;
  const last = toNumber(m.last_price_dollars);
  // Kalshi shows "chance" as the last trade; fall back to the bid/ask
  // midpoint for a market that hasn't traded yet.
  const live = last !== null && last > 0
    ? last
    : midpoint(toNumber(m.yes_bid_dollars), toNumber(m.yes_ask_dollars));

  return { yes: resolvedYes ?? live, resolvedYes, closesAt: m.close_time ?? null };
}

export async function fetchKalshiHistory(ticker: string, sinceMs: number): Promise<PricePoint[]> {
  const nowS = Math.floor(Date.now() / 1000);
  const startS = Math.floor(sinceMs / 1000);
  const interval = nowS - startS > 14 * 86_400 ? DAY_MINUTES : HOUR_MINUTES;
  const data = await getJson<{ candlesticks?: Candle[] }>(
    `${API}/series/${seriesOf(ticker)}/markets/${encodeURIComponent(ticker)}/candlesticks` +
      `?start_ts=${startS}&end_ts=${nowS}&period_interval=${interval}`,
    HISTORY_REVALIDATE_S,
  );

  return (data?.candlesticks ?? []).flatMap((c) => {
    const close = toNumber(c.price?.close_dollars)
      ?? midpoint(toNumber(c.yes_bid?.close_dollars), toNumber(c.yes_ask?.close_dollars));
    return close === null ? [] : [{ time: c.end_period_ts * 1000, price: close }];
  });
}
