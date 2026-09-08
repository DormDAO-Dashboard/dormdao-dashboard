// Auto-resolves CoinGecko IDs for tickers not in TOKEN_META.
// Results are cached in-memory for the lifetime of the server process
// so searches only fire once per ticker (not on every request).
import { withFetchTimeout } from "@/lib/fetchWithTimeout";

const coingeckoFetch = withFetchTimeout(8_000);

interface Resolved {
  geckoId: string;
  symbol: string;
  name: string;
}

// A "no match" result gets a short TTL rather than caching forever like a
// found one does — the whole point of this file is resolving tickers for
// tokens a school JUST bought, which are disproportionately likely to be so
// new they aren't listed on CoinGecko yet. Caching that "no match" for the
// life of the server process meant a token that listed a few hours or days
// later stayed permanently stuck showing "—" until a cold start happened to
// clear it — exactly the "recently opened positions" pattern this was
// reported against. A real match, once found, can't un-list, so it's still
// cached indefinitely.
const NEGATIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { result: Resolved | null; expiresAt: number | null }>();
// Tickers confirmed to have no CoinGecko listing — skip re-searching
const KNOWN_UNLISTED = new Set(["HYPERLIQUID VAULT"]);

function symbolMatches(coinSymbol: string, ticker: string): boolean {
  const sym = coinSymbol.toUpperCase().replace(/[-_\s]/g, "");
  const tick = ticker.toUpperCase().replace(/[-_\s]/g, "");
  return sym === tick || tick.startsWith(sym) || sym.startsWith(tick);
}

export async function resolveGeckoId(ticker: string): Promise<Resolved | null> {
  if (KNOWN_UNLISTED.has(ticker)) return null;
  const cached = cache.get(ticker);
  if (cached && (cached.expiresAt === null || Date.now() < cached.expiresAt)) {
    return cached.result;
  }

  try {
    const res = await coingeckoFetch(
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

    cache.set(ticker, { result, expiresAt: result ? null : Date.now() + NEGATIVE_CACHE_TTL_MS });
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
    const res = await coingeckoFetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store" }
    );
    if (!res.ok) return {};
    const data = await res.json();

    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const { ticker, geckoId } of resolved) {
      // Same gap as getPricesForTickers: CoinGecko can return the id key
      // present with no "usd" field for a thin-liquidity/newly-listed coin.
      // This path has no cache to smooth that over — it's re-fetched fresh
      // on every call for any ticker not in TOKEN_META — so a stray $0 here
      // used to surface immediately as a fabricated "-100%" position (worst
      // for a token just bought, before it settles into TOKEN_META). Only
      // trust an actual positive number; otherwise leave the ticker out of
      // the result entirely, same as a resolution failure.
      const usd = data[geckoId]?.usd;
      if (typeof usd === "number" && usd > 0) {
        prices[ticker] = {
          usd,
          usd_24h_change: data[geckoId].usd_24h_change ?? 0,
        };
      }
    }
    return prices;
  } catch {
    return {};
  }
}
