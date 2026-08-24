import { unstable_cache } from "next/cache";
import { fetchSheetsData, SchoolRowWithHoldings } from "./sheets";
import { TICKER_TO_COINGECKO } from "./tokens";
import { SchoolRow } from "./types";
import { isDataCollectionPaused, getSchoolsSnapshot, saveSchoolsSnapshot } from "./data-collection-store";
import { getPositionsBySchool, computeSchoolFromPositions, computeSchoolFromHoldings } from "./positions";
import { getPricesForTickers } from "./prices";
import { getHistoricalEthPrices } from "./eth-price-history";

export type { SchoolRowWithHoldings } from "./sheets";

export interface SchoolsCache {
  schools: SchoolRowWithHoldings[];
  sinceInceptionSchools: SchoolRow[];
  schools2425: SchoolRow[];
  schools2324: SchoolRow[];
  daoReturnEth2526: number | null;
  daoReturnEthAllTime: number | null;
  daoReturnEth2425: number | null;
  daoReturnEth2324: number | null;
  fetchedAt: string;
  totalNAV: number;
  avgUsdReturn: number;
  avgEthReturn: number;
  avgDeployed: number;
  tokenToSchools: Record<string, string[]>;
}

export interface PricesCache {
  prices: Record<string, { usd: number; usd_24h_change: number }>;
  fetchedAt: string;
}

// Two independent sources can override a school's sheet-trusted current-
// season row, in priority order:
//   1. Admin-entered `positions` table rows (highest priority — an explicit
//      manual override).
//   2. This school's own parsed holdings, when the LEADERBOARD tab's
//      aggregate for it is broken (nav <= 0) but its own tab isn't — no
//      reason to show a blank school when we already have its real
//      positions, just not the sheet's own (broken) aggregate of them.
// Schools with a healthy LEADERBOARD row and no admin override pass through
// unchanged. Rank is always recomputed across the full merged list so
// trusted and computed schools sort on one consistent basis.
async function applyInternallyComputedSchools(schools: SchoolRowWithHoldings[]): Promise<SchoolRowWithHoldings[]> {
  const positionsBySchool = await getPositionsBySchool();
  const needsHoldingsFallback = schools.filter(
    (s) => s.nav <= 0 && (s.holdings?.length ?? 0) > 0 && !positionsBySchool[s.name]
  );

  if (Object.keys(positionsBySchool).length === 0 && needsHoldingsFallback.length === 0) {
    return schools;
  }

  const allTickers = new Set<string>(["ETH"]);
  const datesNeedingHistoricalPrice = new Set<string>();
  for (const positions of Object.values(positionsBySchool)) {
    for (const p of positions) {
      allTickers.add(p.ticker.toUpperCase());
      if (p.purchase_price_usd == null && p.cost_basis_eth > 0) {
        datesNeedingHistoricalPrice.add(p.investment_date);
      }
    }
  }
  for (const school of needsHoldingsFallback) {
    for (const h of school.holdings ?? []) {
      allTickers.add(h.ticker.toUpperCase());
      if (h.costBasisEth > 0) datesNeedingHistoricalPrice.add(h.investmentDate);
    }
  }

  const [prices, historicalEth] = await Promise.all([
    getPricesForTickers([...allTickers]),
    getHistoricalEthPrices([...datesNeedingHistoricalPrice]),
  ]);

  // Quarterly figures come from a fixed cell in each school's own tab,
  // independent of whichever source ends up driving NAV/return below —
  // preserve them across the override either way.
  const quarterlyByName = new Map(schools.map((s) => [s.name, { quarterlyUsdReturn: s.quarterlyUsdReturn, quarterlyEthReturn: s.quarterlyEthReturn }]));

  const bySchoolName = new Map(schools.map((s) => [s.name, s]));

  for (const school of needsHoldingsFallback) {
    bySchoolName.set(
      school.name,
      computeSchoolFromHoldings(school.name, school.holdings ?? [], school.exitedHoldings ?? [], school.nftHoldings ?? [], prices, historicalEth)
    );
  }
  for (const [schoolName, positions] of Object.entries(positionsBySchool)) {
    bySchoolName.set(schoolName, computeSchoolFromPositions(schoolName, positions, prices, historicalEth));
  }

  for (const s of bySchoolName.values()) {
    const q = quarterlyByName.get(s.name);
    if (q) {
      s.quarterlyUsdReturn ??= q.quarterlyUsdReturn;
      s.quarterlyEthReturn ??= q.quarterlyEthReturn;
    }
  }

  const merged = [...bySchoolName.values()].sort((a, b) => b.ethReturn - a.ethReturn);
  merged.forEach((s, i) => { s.rank = i + 1; });
  return merged;
}

const getSchoolsDataLive = unstable_cache(
  async (): Promise<SchoolsCache> => {
    const sheetsData = await fetchSheetsData();
    const { sinceInceptionSchools, schools2425, schools2324, daoReturnEth2526, daoReturnEthAllTime, daoReturnEth2425, daoReturnEth2324, fetchedAt } = sheetsData;
    const schools = await applyInternallyComputedSchools(sheetsData.schools);
    const len = schools.length || 1;

    const totalNAV = schools.reduce((s, x) => s + x.nav, 0);
    const avgUsdReturn = schools.reduce((s, x) => s + x.usdReturn, 0) / len;
    const avgEthReturn = schools.reduce((s, x) => s + x.ethReturn, 0) / len;
    const avgDeployed = schools.reduce((s, x) => s + x.pctDeployed, 0) / len;

    // Dedupe by school per ticker — a school can hold the same token across
    // multiple separate positions/tranches, which would otherwise inflate
    // both the displayed school-chip list and schoolCount stats.
    const tokenToSchoolSets: Record<string, Set<string>> = {};
    for (const school of schools) {
      for (const h of school.holdings ?? []) {
        if (!tokenToSchoolSets[h.ticker]) tokenToSchoolSets[h.ticker] = new Set();
        tokenToSchoolSets[h.ticker].add(school.name);
      }
    }
    const tokenToSchools: Record<string, string[]> = Object.fromEntries(
      Object.entries(tokenToSchoolSets).map(([ticker, set]) => [ticker, [...set]])
    );

    const result: SchoolsCache = { schools, sinceInceptionSchools, schools2425, schools2324, daoReturnEth2526, daoReturnEthAllTime, daoReturnEth2425, daoReturnEth2324, fetchedAt, totalNAV, avgUsdReturn, avgEthReturn, avgDeployed, tokenToSchools };
    await saveSchoolsSnapshot(result);
    return result;
  },
  ["schools-data-v23"],
  { revalidate: 300 }
);

function emptySchoolsCache(): SchoolsCache {
  return {
    schools: [], sinceInceptionSchools: [], schools2425: [], schools2324: [],
    daoReturnEth2526: null, daoReturnEthAllTime: null, daoReturnEth2425: null, daoReturnEth2324: null,
    fetchedAt: new Date().toISOString(),
    totalNAV: 0, avgUsdReturn: 0, avgEthReturn: 0, avgDeployed: 0, tokenToSchools: {},
  };
}

// Admin "Pause Data Collection" switch (Admin Settings) routes through here —
// while paused this must NEVER call fetchSheetsData(), full stop, so the
// check happens before getSchoolsDataLive is even reached.
export async function getSchoolsData(): Promise<SchoolsCache> {
  if (await isDataCollectionPaused()) {
    const snapshot = await getSchoolsSnapshot<SchoolsCache>();
    return snapshot ?? emptySchoolsCache();
  }
  return getSchoolsDataLive();
}

const BATCH_SIZE = 20;

export const getAllPrices = unstable_cache(
  async (): Promise<PricesCache> => {
    // Log any tickers that still lack a geckoId (and aren't intentional vault/premarket)
    const { TOKEN_META: META } = await import("./tokens");
    const noGeckoTickers = Object.entries(META).filter(([, m]) => !m.geckoId && !m.vault);
    const noPriceTickers = noGeckoTickers.map(([t, m]) => `${t}${m.premarket ? " (premarket)" : ""}`);
    if (noPriceTickers.length > 0) {
      console.warn("[prices] Tickers without CoinGecko ID:", noPriceTickers.join(", "));
    }

    const allGeckoIds = [...new Set(Object.values(TICKER_TO_COINGECKO))];

    const batches: string[][] = [];
    for (let i = 0; i < allGeckoIds.length; i += BATCH_SIZE) {
      batches.push(allGeckoIds.slice(i, i + BATCH_SIZE));
    }

    const results = await Promise.all(
      batches.map(async (batch) => {
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${batch.join(",")}&vs_currencies=usd&include_24hr_change=true`
          );
          if (!res.ok) return {};
          return res.json() as Promise<Record<string, { usd: number; usd_24h_change: number }>>;
        } catch {
          return {};
        }
      })
    );

    const raw: Record<string, { usd: number; usd_24h_change: number }> = Object.assign({}, ...results);

    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const [ticker, geckoId] of Object.entries(TICKER_TO_COINGECKO)) {
      if (raw[geckoId]) {
        prices[ticker] = {
          usd: raw[geckoId].usd ?? 0,
          usd_24h_change: raw[geckoId].usd_24h_change ?? 0,
        };
      }
    }

    // Auto-resolve prices for tokens that have no geckoId in TOKEN_META
    const unknownTickers = noGeckoTickers.map(([t]) => t);
    if (unknownTickers.length > 0) {
      const { resolveUnknownPrices } = await import("./gecko-search");
      const discovered = await resolveUnknownPrices(unknownTickers);
      Object.assign(prices, discovered);
    }

    return { prices, fetchedAt: new Date().toISOString() };
  },
  ["all-prices"],
  { revalidate: 60 }
);
