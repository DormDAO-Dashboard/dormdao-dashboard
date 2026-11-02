import { createServiceClient } from "@/lib/supabase/server";
import { getSchoolsData } from "@/lib/cache";
import { SCHOOL_NAMES } from "@/lib/schoolData";
import {
  SEASON_START_DATE, SEASON_START_NAV_USD, SEASON_START_NAV_ETH, SEASON_START_ETH_USD, inceptionBaselineForYear,
} from "@/lib/seasonBaseline";
import { ethPriceFromHoldings, getBaselineSnapshot, type StoredSnapshotHolding } from "@/lib/snapshotReturns";
import { parseDateMsAsc } from "@/lib/holdings";
import type { ExitedHolding, Holding } from "@/lib/types";

// The monthly reports describe a finished month, not today. Every figure in
// them is rebuilt from the hourly `portfolio_snapshots` history as of the
// close of that month, so the October report reads "as of Oct 31" whether
// it's previewed on Nov 2 or Nov 20, and only rolls over to November once
// November has ended.
//
// Season and Since Inception returns are recomputed from each school's
// closing NAV with the exact formulas the live leaderboard uses
// (applySeasonBaselineReturn / computeSinceInceptionSchools in
// lib/cache.ts), priced at the ETH price recorded in that same snapshot.

export interface ReportPeriod {
  // First instant of the report month (UTC), e.g. 2026-10-01T00:00Z.
  monthStart: Date;
  // First instant after it, e.g. 2026-11-01T00:00Z. Data must be before this.
  cutoff: Date;
  // Last day of the month, for "As of Oct 31, 2026" labels.
  asOf: Date;
}

// The most recently completed calendar month (UTC) as of `now`.
export function previousMonthPeriod(now: Date = new Date()): ReportPeriod {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthStart = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() - 1, 1));
  return { monthStart, cutoff, asOf: new Date(cutoff.getTime() - 86_400_000) };
}

export interface ClosingSchool {
  name: string;
  capturedAt: string;
  navUsd: number;
  pctDeployed: number;
  ethPriceUsd: number;
  // Tranche-level, as stored; liquid and NFT kept apart like the live data.
  holdings: Holding[];
  nftHoldings: Holding[];
  // Live exits list filtered to exits dated before the cutoff.
  exitedHoldings: ExitedHolding[];
  seasonUsdReturn: number;
  seasonEthReturn: number;
  inceptionUsdReturn: number | null;
  inceptionEthReturn: number | null;
  // 1-based, by season ETH return across schools with a closing snapshot.
  seasonRank: number;
}

export interface ClosingState {
  period: ReportPeriod;
  schools: ClosingSchool[];
  // Schools with no usable snapshot before the cutoff.
  missing: string[];
  // Closing snapshots taken well before the end of the month.
  stale: Array<{ name: string; capturedAt: string }>;
}

function toHolding(h: StoredSnapshotHolding): Holding {
  return {
    ticker: h.ticker,
    blockchain: h.blockchain ?? "",
    tokens: h.tokens,
    entryFdv: "",
    costBasisEth: h.costBasisEth,
    pctOfPortfolio: 0,
    investmentDate: h.investmentDate ?? "",
    marketValueUsd: h.marketValueUsd,
    gainUsd: h.gainUsd,
    roiUsdPct: h.roiUsdPct,
    roiEthPct: h.roiEthPct,
  };
}

interface SnapshotRow {
  captured_at: string;
  nav_usd: number;
  deployed_pct: number | null;
  eth_return_pct: number | null;
  usd_return_pct: number | null;
  holdings: StoredSnapshotHolding[] | null;
  nft_holdings: StoredSnapshotHolding[] | null;
}

// Last snapshot before the cutoff that actually has data. A snapshot taken
// during a failed upstream fetch (NAV 0, no holdings, as on 2026-11-02) is
// skipped rather than reported as the month's close.
async function closingSnapshot(schoolName: string, cutoff: Date): Promise<SnapshotRow | null> {
  const { data } = await createServiceClient()
    .from("portfolio_snapshots")
    .select("captured_at, nav_usd, deployed_pct, eth_return_pct, usd_return_pct, holdings, nft_holdings")
    .eq("school_name", schoolName)
    .lt("captured_at", cutoff.toISOString())
    .gt("nav_usd", 0)
    .order("captured_at", { ascending: false })
    .limit(6);
  return ((data ?? []) as SnapshotRow[]).find((r) => (r.holdings?.length ?? 0) > 0) ?? null;
}

const STALE_AFTER_MS = 36 * 3_600_000;

export async function getClosingState(period: ReportPeriod): Promise<ClosingState> {
  const live = await getSchoolsData();
  const exitsByName = new Map(live.schools.map((s) => [s.name, s.exitedHoldings ?? []]));
  const openingYears = live.subDaoOpeningYearByName;

  const rows = await Promise.all(SCHOOL_NAMES.map(async (name) => ({ name, row: await closingSnapshot(name, period.cutoff) })));

  // One ETH price for schools whose own snapshot has no ETH holding to read it from.
  const fallbackEthPrice = rows
    .map((r) => (r.row ? ethPriceFromHoldings(r.row.holdings) : null))
    .find((p): p is number => p != null && p > 0) ?? SEASON_START_ETH_USD;

  const missing: string[] = [];
  const stale: ClosingState["stale"] = [];
  const schools: ClosingSchool[] = [];
  for (const { name, row } of rows) {
    if (!row) { missing.push(name); continue; }
    if (period.cutoff.getTime() - new Date(row.captured_at).getTime() > STALE_AFTER_MS) {
      stale.push({ name, capturedAt: row.captured_at });
    }
    const ethPriceUsd = ethPriceFromHoldings(row.holdings) ?? fallbackEthPrice;
    const nav = row.nav_usd;

    // Season — same as applySeasonBaselineReturn.
    let seasonUsdReturn = row.usd_return_pct ?? 0;
    let seasonEthReturn = row.eth_return_pct ?? 0;
    const baseUsd = SEASON_START_NAV_USD[name];
    if (baseUsd != null && baseUsd > 0) {
      seasonUsdReturn = ((nav - baseUsd) / baseUsd) * 100;
      const baseEth = SEASON_START_NAV_ETH[name] ?? baseUsd / SEASON_START_ETH_USD;
      seasonEthReturn = ((nav / ethPriceUsd - baseEth) / baseEth) * 100;
    }

    // Since Inception — same as computeSinceInceptionSchools: the school's
    // opening-cohort baseline, or its season return when it has none.
    let inceptionUsdReturn: number | null = null;
    let inceptionEthReturn: number | null = null;
    if (openingYears) {
      const base = inceptionBaselineForYear(openingYears[name] ?? null);
      inceptionUsdReturn = base ? (base.usdCost > 0 ? ((nav - base.usdCost) / base.usdCost) * 100 : 0) : seasonUsdReturn;
      inceptionEthReturn = base
        ? (base.ethAmount > 0 ? ((nav / ethPriceUsd - base.ethAmount) / base.ethAmount) * 100 : seasonEthReturn)
        : seasonEthReturn;
    }

    const cutoffMs = period.cutoff.getTime();
    schools.push({
      name,
      capturedAt: row.captured_at,
      navUsd: nav,
      pctDeployed: row.deployed_pct ?? 0,
      ethPriceUsd,
      holdings: (row.holdings ?? []).map(toHolding),
      nftHoldings: (row.nft_holdings ?? []).map(toHolding),
      exitedHoldings: (exitsByName.get(name) ?? []).filter((ex) => {
        const ms = parseDateMsAsc(ex.exitDate);
        return Number.isFinite(ms) && ms < cutoffMs;
      }),
      seasonUsdReturn,
      seasonEthReturn,
      inceptionUsdReturn,
      inceptionEthReturn,
      seasonRank: 0,
    });
  }

  schools.sort((a, b) => b.seasonEthReturn - a.seasonEthReturn);
  schools.forEach((s, i) => { s.seasonRank = i + 1; });
  return { period, schools, missing, stale };
}

export interface MonthReturn {
  usdReturnPct: number;
  ethReturnPct: number;
  // Snapshot the month was measured from; null when the month starts at
  // the season start and season figures are used instead.
  baselineCapturedAt: string | null;
}

export function monthIsSeasonStart(period: ReportPeriod): boolean {
  return period.monthStart.toISOString().slice(0, 10) === SEASON_START_DATE;
}

// A school's return over the report month: closing NAV against its first
// snapshot of the month. When the month IS the first month of the season
// the two windows are identical, so the season figures (measured from the
// leaderboard's fixed season-start baselines) are reused — otherwise one
// period would show two slightly different numbers.
export async function monthReturn(school: ClosingSchool, period: ReportPeriod): Promise<MonthReturn | null> {
  if (monthIsSeasonStart(period)) {
    return { usdReturnPct: school.seasonUsdReturn, ethReturnPct: school.seasonEthReturn, baselineCapturedAt: null };
  }
  const base = await getBaselineSnapshot(school.name, period.monthStart.toISOString());
  if (!base || !base.nav_usd || new Date(base.captured_at) >= period.cutoff) return null;
  const baseEthPrice = ethPriceFromHoldings(base.holdings);
  if (!baseEthPrice) return null;
  const baseEth = base.nav_usd / baseEthPrice;
  return {
    usdReturnPct: ((school.navUsd - base.nav_usd) / base.nav_usd) * 100,
    ethReturnPct: ((school.navUsd / school.ethPriceUsd - baseEth) / baseEth) * 100,
    baselineCapturedAt: base.captured_at,
  };
}
