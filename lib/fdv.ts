import { TICKER_TO_COINGECKO } from "@/lib/tokens";
import { withFetchTimeout } from "@/lib/fetchWithTimeout";

const coingeckoFetch = withFetchTimeout(8_000);

// Parses the sheet's free-text Entry FDV cell ("$7,320M", "$1.2B", "$221M")
// into a plain USD number. Also accepts a bare number (the admin-entered
// positions.entry_fdv_usd override arrives pre-parsed, but a caller may
// still round-trip it through here as a string).
export function parseFdvString(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return isFinite(raw) && raw > 0 ? raw : null;
  const cleaned = raw.trim().replace(/[$,]/g, "").replace(/\+$/, "");
  if (!cleaned) return null;
  const match = cleaned.match(/^([\d.]+)\s*([kKmMbBtT]?)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (!isFinite(num) || num <= 0) return null;
  const suffix = match[2].toUpperCase();
  const mult = suffix === "K" ? 1e3 : suffix === "M" ? 1e6 : suffix === "B" ? 1e9 : suffix === "T" ? 1e12 : 1;
  return num * mult;
}

// Dorm DAO's Programmatic Liquidation Policy (resolved 2024-06-01): a
// position's liquidation multiple target is set by its FDV bucket AT ENTRY,
// not its current FDV — a position doesn't move buckets as it appreciates.
// Buckets are checked richest-first since ranges are lower-bound-inclusive.
const FDV_MULTIPLE_BUCKETS: Array<{ minEntryFdvUsd: number; multiple: number }> = [
  { minEntryFdvUsd: 10_000_000_000, multiple: 2.0 },  // $10B+
  { minEntryFdvUsd: 5_000_000_000, multiple: 3.0 },   // $5B – $10B
  { minEntryFdvUsd: 1_000_000_000, multiple: 5.0 },   // $1B – $5B
  { minEntryFdvUsd: 500_000_000, multiple: 7.0 },     // $500M – $1B
  { minEntryFdvUsd: 0, multiple: 10.0 },              // below $500M
];

export function multipleForEntryFdv(entryFdvUsd: number): number {
  for (const b of FDV_MULTIPLE_BUCKETS) {
    if (entryFdvUsd >= b.minEntryFdvUsd) return b.multiple;
  }
  return 10.0;
}

export interface LiquidationStatus {
  entryFdvUsd: number;
  currentFdvUsd: number;
  multipleTarget: number;
  currentMultiple: number;
  liquidationThresholdFdvUsd: number;
  warningThresholdFdvUsd: number; // 90% of liquidationThresholdFdvUsd
  status: "ok" | "warning" | "crossed";
}

// Upon a position's current FDV reaching multipleTarget × its entry FDV,
// the policy triggers a 50% programmatic liquidation. `warning` fires at
// 90% of that same FDV level (equivalently, 90% of the multiple target —
// the two are the same threshold expressed either way).
export function checkLiquidationStatus(entryFdvUsd: number, currentFdvUsd: number): LiquidationStatus | null {
  if (!(entryFdvUsd > 0) || !(currentFdvUsd > 0)) return null;
  const multipleTarget = multipleForEntryFdv(entryFdvUsd);
  const currentMultiple = currentFdvUsd / entryFdvUsd;
  const liquidationThresholdFdvUsd = entryFdvUsd * multipleTarget;
  const warningThresholdFdvUsd = liquidationThresholdFdvUsd * 0.9;

  let status: LiquidationStatus["status"] = "ok";
  if (currentFdvUsd >= liquidationThresholdFdvUsd) status = "crossed";
  else if (currentFdvUsd >= warningThresholdFdvUsd) status = "warning";

  return { entryFdvUsd, currentFdvUsd, multipleTarget, currentMultiple, liquidationThresholdFdvUsd, warningThresholdFdvUsd, status };
}

// ── Current FDV, live from CoinGecko ────────────────────────────────────────
// /simple/price (lib/prices.ts) doesn't return FDV — only /coins/markets
// does, via its fully_diluted_valuation field. Separate cache/batching from
// getPricesForTickers, same shape, so a stale/rate-limited FDV fetch never
// blocks or corrupts the price fetch it usually runs alongside.

interface FdvCacheEntry {
  fdvUsd: number | null;
  expiresAt: number;
}

const fdvCache = new Map<string, FdvCacheEntry>();
const FDV_CACHE_TTL = 60_000;
const BATCH_SIZE = 20;

async function fetchMarketsBatch(ids: string[]): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await coingeckoFetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(",")}`
      );
      if (res.ok) {
        const json = (await res.json()) as Array<{ id: string; fully_diluted_valuation: number | null }>;
        for (const row of json) out[row.id] = row.fully_diluted_valuation ?? null;
        return out;
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 750));
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 750));
    }
  }
  return out;
}

export async function getCurrentFdvForTickers(tickersInput: string[]): Promise<Record<string, number>> {
  const tickers = [...new Set(tickersInput.map((t) => t.trim().toUpperCase()))];
  const idsForTicker = new Map<string, string>();
  for (const t of tickers) {
    const id = TICKER_TO_COINGECKO[t];
    if (id) idsForTicker.set(t, id);
  }

  const now = Date.now();
  const allIds = [...new Set(idsForTicker.values())];
  const staleIds = allIds.filter((id) => {
    const cached = fdvCache.get(id);
    return !cached || now >= cached.expiresAt;
  });

  if (staleIds.length > 0) {
    const batches: string[][] = [];
    for (let i = 0; i < staleIds.length; i += BATCH_SIZE) batches.push(staleIds.slice(i, i + BATCH_SIZE));
    const results = await Promise.all(batches.map(fetchMarketsBatch));
    for (const result of results) {
      for (const [id, fdv] of Object.entries(result)) {
        fdvCache.set(id, { fdvUsd: fdv, expiresAt: now + FDV_CACHE_TTL });
      }
    }
  }

  const out: Record<string, number> = {};
  for (const [ticker, id] of idsForTicker) {
    const cached = fdvCache.get(id);
    if (cached?.fdvUsd != null) out[ticker] = cached.fdvUsd;
  }
  return out;
}
