// Live USD equity for a specific depositor's stake in a specific Hyperliquid
// vault — used for positions where the school's holding is "my slice of a
// vault", not "some tokens at a market price" (see lib/hyperliquidVaults.ts).
// Hyperliquid vaults are USDC-denominated, so "equity" from the API is
// already the USD value — no separate price lookup needed.
import { withFetchTimeout } from "@/lib/fetchWithTimeout";

const hyperliquidFetch = withFetchTimeout(8_000);

interface CacheEntry {
  usd: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000;

function cacheKey(vaultAddress: string, userAddress: string): string {
  return `${vaultAddress.toLowerCase()}:${userAddress.toLowerCase()}`;
}

async function fetchUserVaultEquities(
  userAddress: string
): Promise<Array<{ vaultAddress: string; equity: string }> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await hyperliquidFetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "userVaultEquities", user: userAddress }),
        cache: "no-store",
      });
      if (res.ok) return await res.json();
    } catch {
      // fall through to retry/backoff below
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

// Returns the USD equity `userAddress` currently holds in `vaultAddress`, or
// null if that user has no stake there (or the API request failed and there's
// no previously cached value to fall back on — same stale-on-failure pattern
// as lib/prices.ts, so a Hyperliquid hiccup shows a stale number, not $0).
export async function getVaultUserEquityUsd(
  vaultAddress: string,
  userAddress: string
): Promise<number | null> {
  const key = cacheKey(vaultAddress, userAddress);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now < cached.expiresAt) return cached.usd;

  const equities = await fetchUserVaultEquities(userAddress);
  if (!equities) return cached?.usd ?? null;

  const entry = equities.find((e) => e.vaultAddress.toLowerCase() === vaultAddress.toLowerCase());
  const usd = entry ? parseFloat(entry.equity) : 0;
  if (isNaN(usd)) return cached?.usd ?? null;

  cache.set(key, { usd, expiresAt: now + CACHE_TTL });
  return usd;
}
