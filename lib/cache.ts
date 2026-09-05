import { unstable_cache } from "next/cache";
import { fetchSheetsData, SchoolRowWithHoldings } from "./sheets";
import { TICKER_TO_COINGECKO } from "./tokens";
import { SchoolRow } from "./types";
import { isDataCollectionPaused, getSchoolsSnapshot, saveSchoolsSnapshot } from "./data-collection-store";
import { getPositionsBySchool, computeSchoolFromPositions, computeSchoolFromHoldings } from "./positions";
import { getPricesForTickers } from "./prices";
import { getHistoricalEthPrices } from "./eth-price-history";
import { SEASON_START_NAV_USD, SEASON_START_ETH_USD, inceptionBaselineForYear } from "./seasonBaseline";
import { HYPERLIQUID_VAULT_POSITIONS } from "./hyperliquidVaults";
import { getVaultUserEquityUsd } from "./hyperliquid";

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

// A school's USD/ETH return since each position's own purchase date
// conflates all-time return with season return (a position bought in 2023
// and still held would show its 2023-to-now return on the "Current Season"
// panel). When we have a season-start NAV baseline for this school, use
// season-to-date NAV growth instead — conceptually correct, and sidesteps
// CoinGecko's 365-day historical-price limit for older positions entirely
// (SEASON_START_ETH_USD was provided directly, not fetched).
function applySeasonBaselineReturn(row: SchoolRowWithHoldings, ethPriceUsdNow: number): SchoolRowWithHoldings {
  const baselineNavUsd = SEASON_START_NAV_USD[row.name];
  if (baselineNavUsd == null || baselineNavUsd <= 0) return row;

  const usdReturn = ((row.nav - baselineNavUsd) / baselineNavUsd) * 100;
  const baselineNavEth = baselineNavUsd / SEASON_START_ETH_USD;
  const currentNavEth = ethPriceUsdNow > 0 ? row.nav / ethPriceUsdNow : null;
  const ethReturn = currentNavEth !== null ? ((currentNavEth - baselineNavEth) / baselineNavEth) * 100 : row.ethReturn;

  return { ...row, usdReturn, ethReturn };
}

// Two independent sources can override a school's sheet-trusted current-
// season row, in priority order:
//   1. Admin-entered `positions` table rows (highest priority — an explicit
//      manual override, including per-position purchase price).
//   2. This school's own parsed holdings — NAV is always recomputed from
//      live prices when holdings data exists (more current than whatever
//      the sheet last synced, and robust to the LEADERBOARD tab's aggregate
//      cells breaking), and USD/ETH return is season-baseline-derived
//      whenever we have a baseline for that school (applySeasonBaselineReturn
//      above), else falls back to a since-purchase calculation.
// A school with holdings data missing entirely (fetch failure) passes
// through with whatever the sheet produced. Rank is always recomputed
// across the full merged list so every school sorts on one consistent basis.
async function applyInternallyComputedSchools(schools: SchoolRowWithHoldings[]): Promise<SchoolRowWithHoldings[]> {
  const positionsBySchool = await getPositionsBySchool();
  const needsComputedNav = schools.filter(
    (s) => (s.holdings?.length ?? 0) > 0 && !positionsBySchool[s.name]
  );

  if (Object.keys(positionsBySchool).length === 0 && needsComputedNav.length === 0) {
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
  for (const school of needsComputedNav) {
    for (const h of school.holdings ?? []) {
      allTickers.add(h.ticker.toUpperCase());
      // Only need a per-position historical price when this school has no
      // season baseline to fall back on instead.
      if (h.costBasisEth > 0 && SEASON_START_NAV_USD[school.name] == null) {
        datesNeedingHistoricalPrice.add(h.investmentDate);
      }
    }
  }

  // Schools with a holding that's actually a depositor's slice of a shared
  // Hyperliquid vault (see lib/hyperliquidVaults.ts) need their equity looked
  // up per-user, not priced by ticker like a normal token.
  const vaultLookups: { schoolName: string; ticker: string; vaultAddress: string; userAddress: string }[] = [];
  for (const schoolName of new Set([...needsComputedNav.map((s) => s.name), ...Object.keys(positionsBySchool)])) {
    for (const [ticker, { vaultAddress, userAddress }] of Object.entries(HYPERLIQUID_VAULT_POSITIONS[schoolName] ?? {})) {
      vaultLookups.push({ schoolName, ticker, vaultAddress, userAddress });
    }
  }

  const [prices, historicalEth, vaultEquityResults] = await Promise.all([
    getPricesForTickers([...allTickers]),
    getHistoricalEthPrices([...datesNeedingHistoricalPrice]),
    Promise.all(vaultLookups.map(async (l) => ({ ...l, usd: await getVaultUserEquityUsd(l.vaultAddress, l.userAddress) }))),
  ]);
  const ethPriceUsdNow = prices.ETH?.usd ?? 0;

  const vaultEquityBySchool: Record<string, Record<string, number>> = {};
  for (const v of vaultEquityResults) {
    // null means the lookup failed with nothing cached to fall back on —
    // leave it unset so computeSchoolMetrics falls through to tokens*price
    // (today's behavior) rather than asserting a wrong $0.
    if (v.usd == null) continue;
    (vaultEquityBySchool[v.schoolName] ??= {})[v.ticker] = v.usd;
  }

  // Quarterly figures come from a fixed cell in each school's own tab,
  // independent of whichever source ends up driving NAV/return below —
  // preserve them across the override either way.
  const quarterlyByName = new Map(schools.map((s) => [s.name, { quarterlyUsdReturn: s.quarterlyUsdReturn, quarterlyEthReturn: s.quarterlyEthReturn }]));

  const bySchoolName = new Map(schools.map((s) => [s.name, s]));

  for (const school of needsComputedNav) {
    const computed = computeSchoolFromHoldings(school.name, school.holdings ?? [], school.exitedHoldings ?? [], school.nftHoldings ?? [], prices, historicalEth, vaultEquityBySchool[school.name]);
    bySchoolName.set(school.name, applySeasonBaselineReturn(computed, ethPriceUsdNow));
  }
  for (const [schoolName, positions] of Object.entries(positionsBySchool)) {
    const computed = computeSchoolFromPositions(schoolName, positions, prices, historicalEth, vaultEquityBySchool[schoolName]);
    bySchoolName.set(schoolName, applySeasonBaselineReturn(computed, ethPriceUsdNow));
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

// Builds the All-Time (Since Inception) panel from the already-live-computed
// `schools` NAV, using each school's inception-cohort baseline (its own
// "Sub DAO Opening" year — see lib/sheets.ts) instead of the LEADERBOARD
// tab's broken "Since Inception" section. Both the baseline ETH amount and
// USD cost are given directly (lib/seasonBaseline.ts), so no historical
// price lookup is needed at all. Schools with no cohort baseline (joined
// this season, or an unrecognized opening date) mirror their Current Season
// return exactly, per the same rule for the 2025-cohort schools.
function computeSinceInceptionSchools(
  schools: SchoolRowWithHoldings[],
  openingYearByName: Record<string, number | null>,
  ethPriceUsdNow: number
): SchoolRow[] {
  const rows: SchoolRow[] = schools.map((school) => {
    const baseline = inceptionBaselineForYear(openingYearByName[school.name] ?? null);
    let usdReturn = school.usdReturn;
    let ethReturn = school.ethReturn;

    if (baseline) {
      usdReturn = baseline.usdCost > 0 ? ((school.nav - baseline.usdCost) / baseline.usdCost) * 100 : 0;
      const currentNavEth = ethPriceUsdNow > 0 ? school.nav / ethPriceUsdNow : null;
      ethReturn = currentNavEth !== null && baseline.ethAmount > 0
        ? ((currentNavEth - baseline.ethAmount) / baseline.ethAmount) * 100
        : school.ethReturn;
    }

    return {
      rank: 0, // reassigned below
      name: school.name,
      slug: school.slug,
      nav: school.nav,
      usdReturn,
      ethReturn,
      avgEntryFdv: 0,
      pctDeployed: school.pctDeployed,
    };
  });

  rows.sort((a, b) => b.ethReturn - a.ethReturn);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

// Last line of defense against a transient upstream failure (Google Sheets
// gviz, Supabase positions, CoinGecko — all three retry on their own, but
// none of them can guarantee success every cycle) blanking out data we
// already know. A school legitimately at $0 NAV (new, no positions yet) has
// no prior nonzero snapshot to match against, so it's left alone; only a
// school that HAD real data and this cycle came back completely empty gets
// backfilled from the last known-good snapshot.
function patchZeroedFromSnapshot<T extends { name: string; nav: number }>(
  rows: T[],
  previous: T[] | undefined,
  isBroken: (row: T) => boolean
): T[] {
  if (!previous?.length) return rows;
  const prevByName = new Map(previous.map((r) => [r.name, r]));
  return rows.map((row) => {
    if (!isBroken(row)) return row;
    const prev = prevByName.get(row.name);
    return prev && prev.nav > 0 ? prev : row;
  });
}

function rerank<T extends { rank: number; ethReturn: number }>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => b.ethReturn - a.ethReturn);
  sorted.forEach((r, i) => { r.rank = i + 1; });
  return sorted;
}

const getSchoolsDataLive = unstable_cache(
  async (): Promise<SchoolsCache> => {
    const previous = await getSchoolsSnapshot<SchoolsCache>();

    const sheetsData = await fetchSheetsData();
    let { schools2425, schools2324, daoReturnEth2526, daoReturnEthAllTime, daoReturnEth2425, daoReturnEth2324 } = sheetsData;
    const { fetchedAt, subDaoOpeningYearByName } = sheetsData;
    let schools = await applyInternallyComputedSchools(sheetsData.schools);

    // A school whose NAV and holdings both came back empty this cycle is
    // exactly the "whole portfolio missing" failure mode — either its sheet
    // tab or its positions-table fetch didn't come through — vs. a school
    // that's simply, legitimately unfunded. Only the former gets patched.
    schools = rerank(
      patchZeroedFromSnapshot(schools, previous?.schools, (s) => s.nav === 0 && (s.holdings?.length ?? 0) === 0)
    );
    schools2425 = patchZeroedFromSnapshot(schools2425, previous?.schools2425, (s) => s.nav === 0);
    schools2324 = patchZeroedFromSnapshot(schools2324, previous?.schools2324, (s) => s.nav === 0);
    daoReturnEth2526 ??= previous?.daoReturnEth2526 ?? null;
    daoReturnEthAllTime ??= previous?.daoReturnEthAllTime ?? null;
    daoReturnEth2425 ??= previous?.daoReturnEth2425 ?? null;
    daoReturnEth2324 ??= previous?.daoReturnEth2324 ?? null;

    const ethPriceUsdNow = (await getPricesForTickers(["ETH"])).ETH?.usd ?? 0;
    const sinceInceptionSchools = rerank(
      patchZeroedFromSnapshot(
        computeSinceInceptionSchools(schools, subDaoOpeningYearByName, ethPriceUsdNow),
        previous?.sinceInceptionSchools,
        (s) => s.nav === 0
      )
    );
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
  ["schools-data-v24"],
  { revalidate: 600 }
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

export const getAllPrices = unstable_cache(
  async (): Promise<PricesCache> => {
    // Log any tickers that still lack a geckoId (and aren't intentional vault/premarket)
    const { TOKEN_META: META } = await import("./tokens");
    const noGeckoTickers = Object.entries(META).filter(([, m]) => !m.geckoId && !m.vault);
    const noPriceTickers = noGeckoTickers.map(([t, m]) => `${t}${m.premarket ? " (premarket)" : ""}`);
    if (noPriceTickers.length > 0) {
      console.warn("[prices] Tickers without CoinGecko ID:", noPriceTickers.join(", "));
    }

    // Shares getPricesForTickers's per-id cache and stale-on-failure
    // fallback, so a transient CoinGecko error here can't wipe out a price
    // that a page render elsewhere just successfully cached (or vice versa).
    const prices = await getPricesForTickers([
      ...Object.keys(TICKER_TO_COINGECKO),
      ...noGeckoTickers.map(([t]) => t),
    ]);

    return { prices, fetchedAt: new Date().toISOString() };
  },
  ["all-prices"],
  { revalidate: 60 }
);
