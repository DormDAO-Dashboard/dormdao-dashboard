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

  // Retry once on a transient failure (429/5xx/timeout) before accepting
  // "no match" — this endpoint has no persistent cache backing it up the
  // way lib/prices.ts's fetchBatch does, so a single unlucky rate-limit hit
  // used to read identically to the ticker genuinely not existing.
  let data: { coins?: Array<{ id: string; symbol: string; name: string; market_cap_rank: number | null }> } | null = null;
  for (let attempt = 0; attempt < 2 && !data; attempt++) {
    try {
      const res = await coingeckoFetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(ticker)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        data = await res.json();
        break;
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 750));
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 750));
    }
  }
  if (!data) return null; // both attempts failed — leave uncached, retry next call

  const coins = data.coins ?? [];

  // Ticker symbols aren't unique — CoinGecko search for "PUMP" also turns up
  // several unrelated micro-cap coins squatting the same symbol alongside
  // the real Pump.fun token. Taking the first exact-symbol match trusted the
  // search endpoint's relevance ordering to always put the real token first,
  // which isn't a documented guarantee. Among every exact-symbol match,
  // explicitly pick the one with the best (lowest) market cap rank instead —
  // an unranked/unlisted squatter loses to any ranked coin automatically.
  const exactMatches = coins.filter((c) => c.symbol.toUpperCase() === ticker.toUpperCase());
  const exact = exactMatches.length > 0
    ? exactMatches.reduce((best, c) => {
        if (best.market_cap_rank == null) return c.market_cap_rank != null ? c : best;
        if (c.market_cap_rank == null) return best;
        return c.market_cap_rank < best.market_cap_rank ? c : best;
      })
    : undefined;
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
}
