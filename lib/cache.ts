import { unstable_cache } from "next/cache";
import { fetchSheetsData, SchoolRowWithHoldings } from "./sheets";
import { TICKER_TO_COINGECKO } from "./tokens";
import { SchoolRow } from "./types";

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

export const getSchoolsData = unstable_cache(
  async (): Promise<SchoolsCache> => {
    const { schools, sinceInceptionSchools, schools2425, schools2324, daoReturnEth2526, daoReturnEthAllTime, daoReturnEth2425, daoReturnEth2324, fetchedAt } = await fetchSheetsData();
    const len = schools.length || 1;

    const totalNAV = schools.reduce((s, x) => s + x.nav, 0);
    const avgUsdReturn = schools.reduce((s, x) => s + x.usdReturn, 0) / len;
    const avgEthReturn = schools.reduce((s, x) => s + x.ethReturn, 0) / len;
    const avgDeployed = schools.reduce((s, x) => s + x.pctDeployed, 0) / len;

    const tokenToSchools: Record<string, string[]> = {};
    for (const school of schools) {
      for (const h of school.holdings ?? []) {
        if (!tokenToSchools[h.ticker]) tokenToSchools[h.ticker] = [];
        tokenToSchools[h.ticker].push(school.name);
      }
    }

    return { schools, sinceInceptionSchools, schools2425, schools2324, daoReturnEth2526, daoReturnEthAllTime, daoReturnEth2425, daoReturnEth2324, fetchedAt, totalNAV, avgUsdReturn, avgEthReturn, avgDeployed, tokenToSchools };
  },
  ["schools-data-v22"],
  { revalidate: 300 }
);

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
