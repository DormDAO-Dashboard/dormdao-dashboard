import { NextRequest, NextResponse } from "next/server";
import { TICKER_TO_COINGECKO } from "@/lib/tokens";

const cache = new Map<string, { prices: Record<string, { usd: number; usd_24h_change: number }>; expiresAt: number }>();
const CACHE_TTL = 60_000;
const BATCH_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get("tickers");
  const tickers = tickersParam
    ? tickersParam.split(",").map((t) => t.trim().toUpperCase())
    : Object.keys(TICKER_TO_COINGECKO);

  const ids = tickers
    .map((t) => TICKER_TO_COINGECKO[t])
    .filter(Boolean);

  if (!ids.length) {
    return NextResponse.json({ prices: {}, fetchedAt: new Date().toISOString() });
  }

  const cacheKey = ids.join(",");
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return NextResponse.json({
      prices: cached.prices,
      fetchedAt: new Date(cached.expiresAt - CACHE_TTL).toISOString(),
    });
  }

  try {
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      batches.push(ids.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${batch.join(",")}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!res.ok) return {};
        return res.json();
      })
    );

    const data = Object.assign({}, ...batchResults);

    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const ticker of tickers) {
      const geckoId = TICKER_TO_COINGECKO[ticker];
      if (geckoId && data[geckoId]) {
        prices[ticker] = {
          usd: data[geckoId].usd ?? 0,
          usd_24h_change: data[geckoId].usd_24h_change ?? 0,
        };
      }
    }

    cache.set(cacheKey, { prices, expiresAt: now + CACHE_TTL });
    return NextResponse.json({ prices, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (cached) {
      return NextResponse.json({
        prices: cached.prices,
        fetchedAt: new Date(cached.expiresAt - CACHE_TTL).toISOString(),
      });
    }
    return NextResponse.json({ error: msg, prices: {} }, { status: 500 });
  }
}
