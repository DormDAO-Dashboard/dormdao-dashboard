// Auto-resolves CoinGecko IDs for tickers not in TOKEN_META.
// Results are cached in-memory for the lifetime of the server process
// so searches only fire once per ticker (not on every request).

interface Resolved {
  geckoId: string;
  symbol: string;
  name: string;
}

const cache = new Map<string, Resolved | null>();
// Tickers confirmed to have no CoinGecko listing — skip re-searching
const KNOWN_UNLISTED = new Set(["HYPERLIQUID VAULT"]);

function symbolMatches(coinSymbol: string, ticker: string): boolean {
  const sym = coinSymbol.toUpperCase().replace(/[-_\s]/g, "");
  const tick = ticker.toUpperCase().replace(/[-_\s]/g, "");
  return sym === tick || tick.startsWith(sym) || sym.startsWith(tick);
}

export async function resolveGeckoId(ticker: string): Promise<Resolved | null> {
  if (KNOWN_UNLISTED.has(ticker)) return null;
  if (cache.has(ticker)) return cache.get(ticker) ?? null;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(ticker)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const coins: Array<{ id: string; symbol: string; name: string; market_cap_rank: number | null }> =
      data.coins ?? [];

    // Prefer exact symbol match; fall back to first result that passes the loose check
    const exact = coins.find((c) => c.symbol.toUpperCase() === ticker.toUpperCase());
    const loose = coins.find((c) => symbolMatches(c.symbol, ticker));
    const match = exact ?? loose ?? null;

    const result: Resolved | null = match
      ? { geckoId: match.id, symbol: match.symbol.toUpperCase(), name: match.name }
      : null;

    cache.set(ticker, result);
    if (result) {
      console.log(`[gecko-search] ${ticker} → ${result.geckoId} (${result.name})`);
    } else {
      console.log(`[gecko-search] ${ticker} → no match`);
    }
    return result;
  } catch {
    return null;
  }
}

export async function resolveUnknownPrices(
  unknownTickers: string[]
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  if (unknownTickers.length === 0) return {};

  // Resolve IDs — sequential with small delay to respect free-tier rate limits.
  // Results are in-memory cached so subsequent calls are instant.
  const resolved: Array<{ ticker: string; geckoId: string }> = [];
  for (const ticker of unknownTickers) {
    const r = await resolveGeckoId(ticker);
    if (r) resolved.push({ ticker, geckoId: r.geckoId });
    // Only sleep when we actually hit the network (cache miss)
    if (!cache.has(ticker)) await new Promise((r) => setTimeout(r, 350));
  }

  if (resolved.length === 0) return {};

  const ids = [...new Set(resolved.map((r) => r.geckoId))].join(",");
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store" }
    );
    if (!res.ok) return {};
    const data = await res.json();

    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const { ticker, geckoId } of resolved) {
      if (data[geckoId]) {
        prices[ticker] = {
          usd: data[geckoId].usd ?? 0,
          usd_24h_change: data[geckoId].usd_24h_change ?? 0,
        };
      }
    }
    return prices;
  } catch {
    return {};
  }
}
