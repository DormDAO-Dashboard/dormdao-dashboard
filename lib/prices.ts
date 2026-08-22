import { TICKER_TO_COINGECKO } from "@/lib/tokens";

const cache = new Map<string, { prices: Record<string, { usd: number; usd_24h_change: number }>; expiresAt: number }>();
const CACHE_TTL = 60_000;
const BATCH_SIZE = 20;

export async function getPricesForTickers(
  tickersInput: string[]
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  const tickers = tickersInput.map((t) => t.trim().toUpperCase());
  const ids = tickers.map((t) => TICKER_TO_COINGECKO[t]).filter(Boolean);

  if (!ids.length) return {};

  const cacheKey = ids.join(",");
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now < cached.expiresAt) return cached.prices;

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

    // Auto-resolve any tickers not in TICKER_TO_COINGECKO
    const unknownTickers = tickers.filter((t) => !TICKER_TO_COINGECKO[t]);
    if (unknownTickers.length > 0) {
      const { resolveUnknownPrices } = await import("@/lib/gecko-search");
      const discovered = await resolveUnknownPrices(unknownTickers);
      Object.assign(prices, discovered);
    }

    cache.set(cacheKey, { prices, expiresAt: now + CACHE_TTL });
    return prices;
  } catch {
    if (cached) return cached.prices;
    return {};
  }
}
