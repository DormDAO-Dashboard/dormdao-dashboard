import { unstable_cache } from "next/cache";
import { fetchSheetsData, SchoolRowWithHoldings } from "./sheets";
import { TICKER_TO_COINGECKO } from "./tokens";

export type { SchoolRowWithHoldings } from "./sheets";

export interface SchoolsCache {
  schools: SchoolRowWithHoldings[];
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
    const { schools, fetchedAt } = await fetchSheetsData();
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

    return { schools, fetchedAt, totalNAV, avgUsdReturn, avgEthReturn, avgDeployed, tokenToSchools };
  },
  ["schools-data"],
  { revalidate: 300 }
);

const BATCH_SIZE = 20;

export const getAllPrices = unstable_cache(
  async (): Promise<PricesCache> => {
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

    return { prices, fetchedAt: new Date().toISOString() };
  },
  ["all-prices"],
  { revalidate: 60 }
);
