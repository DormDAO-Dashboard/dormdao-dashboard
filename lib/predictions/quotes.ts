import type { Pitch, PricePoint, Quote } from "@/lib/predictions/types";
import { sidePrice } from "@/lib/predictions/math";
import { fetchKalshiHistory, fetchKalshiYes } from "@/lib/predictions/markets/kalshi";
import { fetchPolymarketHistory, fetchPolymarketYes } from "@/lib/predictions/markets/polymarket";
import type { YesQuote } from "@/lib/predictions/markets/http";

function fetchYes(pitch: Pitch): Promise<YesQuote | null> {
  switch (pitch.market.source) {
    case "polymarket": return fetchPolymarketYes(pitch.market.slug);
    case "kalshi": return fetchKalshiYes(pitch.market.ticker);
    case "manual": return Promise.resolve(null);
  }
}

// Live quote converted to the pitch's side. A failed upstream call returns
// null (page shows "unavailable") rather than failing the whole page.
export async function getQuote(pitch: Pitch): Promise<Quote | null> {
  try {
    const q = await fetchYes(pitch);
    if (!q) return null;
    return {
      price: q.yes === null ? null : sidePrice(q.yes, pitch.side),
      resolved: q.resolvedYes !== null,
      resolvedPrice: q.resolvedYes === null ? null : sidePrice(q.resolvedYes, pitch.side),
      closesAt: q.closesAt,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[predictions] quote failed", pitch.id, err);
    return null;
  }
}

export async function getQuotes(pitches: Pitch[]): Promise<Record<string, Quote | null>> {
  const entries = await Promise.all(pitches.map(async (p) => [p.id, await getQuote(p)] as const));
  return Object.fromEntries(entries);
}

export async function getHistory(pitch: Pitch, sinceMs: number): Promise<PricePoint[]> {
  try {
    const points = pitch.market.source === "polymarket"
      ? await fetchPolymarketHistory(pitch.market.slug, sinceMs)
      : pitch.market.source === "kalshi"
        ? await fetchKalshiHistory(pitch.market.ticker, sinceMs)
        : [];
    return points.map((pt) => ({ time: pt.time, price: sidePrice(pt.price, pitch.side) }));
  } catch (err) {
    console.warn("[predictions] history failed", pitch.id, err);
    return [];
  }
}
