import type { MarketRef } from "@/lib/predictions/types";
import type { MarketLink } from "@/lib/predictions/markets/parseLink";
import { getJson, toNumber } from "@/lib/predictions/markets/http";

const GAMMA = "https://gamma-api.polymarket.com";
const KALSHI = "https://api.elections.kalshi.com/trade-api/v2";
const LOOKUP_REVALIDATE_S = 60;

export interface LookupOutcome {
  label: string;
  market: MarketRef;
  yes: number | null; // current YES price
  closed: boolean;
}

export interface LookupResult {
  title: string;
  outcomes: LookupOutcome[];
}

interface GammaMarket {
  slug: string;
  question: string;
  groupItemTitle?: string;
  outcomes: string;
  outcomePrices: string;
  closed: boolean;
}

function yesPrice(m: GammaMarket): number | null {
  try {
    const outcomes: string[] = JSON.parse(m.outcomes);
    const prices: string[] = JSON.parse(m.outcomePrices);
    const idx = Math.max(0, outcomes.findIndex((o) => o.toLowerCase() === "yes"));
    return toNumber(prices[idx]);
  } catch {
    return null;
  }
}

const polyOutcome = (m: GammaMarket): LookupOutcome => ({
  label: m.groupItemTitle || m.question,
  market: { source: "polymarket", slug: m.slug },
  yes: yesPrice(m),
  closed: m.closed,
});

async function lookupPolymarket(eventSlug: string | null, marketSlug: string | null): Promise<LookupResult | null> {
  if (eventSlug) {
    const events = await getJson<{ title: string; markets: GammaMarket[] }[]>(
      `${GAMMA}/events?slug=${encodeURIComponent(eventSlug)}`, LOOKUP_REVALIDATE_S);
    const event = events?.[0];
    if (!event) return null;
    const picked = marketSlug ? event.markets.filter((m) => m.slug === marketSlug) : [];
    return { title: event.title, outcomes: (picked.length ? picked : event.markets).map(polyOutcome) };
  }
  if (!marketSlug) return null;
  // Gamma hides closed markets unless asked.
  const base = `${GAMMA}/markets?slug=${encodeURIComponent(marketSlug)}`;
  const open = await getJson<GammaMarket[]>(base, LOOKUP_REVALIDATE_S);
  const rows = open?.length ? open : await getJson<GammaMarket[]>(`${base}&closed=true`, LOOKUP_REVALIDATE_S);
  const m = rows?.[0];
  return m ? { title: m.question, outcomes: [polyOutcome(m)] } : null;
}

interface KalshiMarket {
  ticker: string;
  title?: string;
  yes_sub_title?: string;
  last_price_dollars?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  status: string;
}

function kalshiYes(m: KalshiMarket): number | null {
  const last = toNumber(m.last_price_dollars);
  if (last !== null && last > 0) return last;
  const bid = toNumber(m.yes_bid_dollars);
  const ask = toNumber(m.yes_ask_dollars);
  return bid !== null && ask !== null && ask > 0 ? (bid + ask) / 2 : null;
}

const kalshiOutcome = (m: KalshiMarket): LookupOutcome => ({
  label: m.yes_sub_title || m.ticker,
  market: { source: "kalshi", ticker: m.ticker },
  yes: kalshiYes(m),
  closed: m.status !== "active",
});

async function lookupKalshi(ticker: string): Promise<LookupResult | null> {
  // A three-part ticker is a single market; two parts is an event.
  const isMarket = ticker.split("-").length >= 3;
  const eventTicker = isMarket ? ticker.split("-").slice(0, 2).join("-") : ticker;
  const [event, list] = await Promise.all([
    getJson<{ event?: { title: string } }>(`${KALSHI}/events/${encodeURIComponent(eventTicker)}`, LOOKUP_REVALIDATE_S),
    getJson<{ markets?: KalshiMarket[] }>(`${KALSHI}/markets?event_ticker=${encodeURIComponent(eventTicker)}&limit=200`, LOOKUP_REVALIDATE_S),
  ]);
  const markets = (list?.markets ?? []).filter((m) => !isMarket || m.ticker === ticker);
  if (markets.length === 0) return null;
  return { title: event?.event?.title ?? markets[0].title ?? eventTicker, outcomes: markets.map(kalshiOutcome) };
}

export function lookupMarket(link: MarketLink): Promise<LookupResult | null> {
  return link.source === "polymarket"
    ? lookupPolymarket(link.eventSlug, link.marketSlug)
    : lookupKalshi(link.ticker);
}
