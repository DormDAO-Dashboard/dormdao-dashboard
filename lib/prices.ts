import { TICKER_TO_COINGECKO } from "@/lib/tokens";

interface PriceEntry {
  usd: number;
  usd_24h_change: number;
}

interface CacheEntry {
  price: PriceEntry;
  expiresAt: number;
}

// Keyed by CoinGecko id (not by the caller's ticker list) so that any two
// requests sharing a token reuse the same cached value regardless of what
// else was requested alongside it — the old per-request-combo cache key
// almost never hit, which meant nearly every page load re-fetched from
// CoinGecko and made rate-limit failures far more likely than they needed
// to be.
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000;
const BATCH_SIZE = 20;

async function fetchBatch(ids: string[]): Promise<Record<string, PriceEntry> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`
      );
      if (res.ok) return await res.json();
      // 429 (rate limit) and 5xx are exactly the transient failures worth
      // retrying once before giving up on this batch.
      if (attempt === 0) await new Promise((r) => setTimeout(r, 750));
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 750));
    }
  }
  return null;
}

export async function getPricesForTickers(
  tickersInput: string[]
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  const tickers = tickersInput.map((t) => t.trim().toUpperCase());
  const idsForTicker = new Map<string, string>();
  for (const t of tickers) {
    const id = TICKER_TO_COINGECKO[t];
    if (id) idsForTicker.set(t, id);
  }

  const now = Date.now();
  const allIds = [...new Set(idsForTicker.values())];
  const staleIds = allIds.filter((id) => {
    const cached = priceCache.get(id);
    return !cached || now >= cached.expiresAt;
  });

  if (staleIds.length > 0) {
    const batches: string[][] = [];
    for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
      batches.push(staleIds.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(batches.map(fetchBatch));

    batches.forEach((batch, i) => {
      const data = batchResults[i];
      if (!data) {
        // Whole batch failed even after a retry — leave any existing cache
        // entries as-is (stale but real) rather than wiping them out. A
        // position briefly showing yesterday's price beats it showing $0.
        console.warn("[prices] CoinGecko batch failed, serving stale/no data for:", batch.join(","));
        return;
      }
      for (const id of batch) {
        if (data[id]) {
          priceCache.set(id, {
            price: { usd: data[id].usd ?? 0, usd_24h_change: data[id].usd_24h_change ?? 0 },
            expiresAt: now + CACHE_TTL,
          });
        }
        // id genuinely absent from a successful response (bad/renamed
        // CoinGecko id) — leave whatever's cached alone rather than assume 0.
      }
    });
  }

  const prices: Record<string, { usd: number; usd_24h_change: number }> = {};
  for (const [ticker, id] of idsForTicker) {
    const cached = priceCache.get(id);
    if (cached) prices[ticker] = cached.price;
  }

  // Auto-resolve any tickers not in TICKER_TO_COINGECKO
  const unknownTickers = tickers.filter((t) => !idsForTicker.has(t));
  if (unknownTickers.length > 0) {
    const { resolveUnknownPrices } = await import("@/lib/gecko-search");
    const discovered = await resolveUnknownPrices(unknownTickers);
    Object.assign(prices, discovered);
  }

  return prices;
}
