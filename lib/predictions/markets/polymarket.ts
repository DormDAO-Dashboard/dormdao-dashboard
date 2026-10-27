import type { PricePoint } from "@/lib/predictions/types";
import { getJson, toNumber, type YesQuote } from "@/lib/predictions/markets/http";

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";
const QUOTE_REVALIDATE_S = 60;
const HISTORY_REVALIDATE_S = 600;

interface GammaMarket {
  slug: string;
  outcomes: string;      // JSON-encoded string array, e.g. '["Yes","No"]'
  outcomePrices: string; // JSON-encoded, aligned with outcomes
  clobTokenIds: string;  // JSON-encoded, aligned with outcomes
  closed: boolean;
  endDate: string | null;
}

function parseList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// Gamma omits closed markets unless asked, so a resolved pick needs a second
// lookup with closed=true.
async function fetchMarket(slug: string): Promise<GammaMarket | null> {
  const base = `${GAMMA}/markets?slug=${encodeURIComponent(slug)}`;
  const open = await getJson<GammaMarket[]>(base, QUOTE_REVALIDATE_S);
  if (open?.[0]) return open[0];
  const closed = await getJson<GammaMarket[]>(`${base}&closed=true`, QUOTE_REVALIDATE_S);
  return closed?.[0] ?? null;
}

function yesIndex(m: GammaMarket): number {
  const idx = parseList(m.outcomes).findIndex((o) => o.toLowerCase() === "yes");
  return idx === -1 ? 0 : idx;
}

export async function fetchPolymarketYes(slug: string): Promise<YesQuote | null> {
  const m = await fetchMarket(slug);
  if (!m) return null;
  const yes = toNumber(parseList(m.outcomePrices)[yesIndex(m)]);
  // A closed market settles to exactly 0 or 1; anything else is still pending.
  const resolvedYes = m.closed && (yes === 0 || yes === 1) ? yes : null;
  return { yes, resolvedYes, closesAt: m.endDate };
}

// Pick a resolution that keeps the chart at a few hundred points.
function fidelityMinutes(spanMs: number): number {
  const days = spanMs / 86_400_000;
  if (days <= 2) return 15;
  if (days <= 14) return 60;
  return 360;
}

export async function fetchPolymarketHistory(slug: string, sinceMs: number): Promise<PricePoint[]> {
  const m = await fetchMarket(slug);
  if (!m) return [];
  const token = parseList(m.clobTokenIds)[yesIndex(m)];
  if (!token) return [];
  const startTs = Math.floor(sinceMs / 1000);
  const fidelity = fidelityMinutes(Date.now() - sinceMs);
  const data = await getJson<{ history?: { t: number; p: number }[] }>(
    `${CLOB}/prices-history?market=${token}&startTs=${startTs}&fidelity=${fidelity}`,
    HISTORY_REVALIDATE_S,
  );
  return (data?.history ?? [])
    .filter((pt) => Number.isFinite(pt.p))
    .map((pt) => ({ time: pt.t * 1000, price: pt.p }));
}
