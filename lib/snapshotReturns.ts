import { createServiceClient } from "@/lib/supabase/server";
import { SEASON_START_DATE } from "@/lib/seasonBaseline";

// Computes real Month-to-Date / Season-to-Date returns (portfolio- and
// position-level) by diffing a school's current numbers against the
// earliest daily `portfolio_snapshots` row captured on or after a window's
// start date. Replaces the illustrative placeholders used in the portfolio
// report email demo once enough post-2026-10-01 snapshot history exists —
// see app/api/snapshot/route.ts, which is what populates the marketValueUsd
// (and gainUsd/roiUsdPct/roiEthPct) fields this reads on each holding.
//
// A school with no snapshot yet at/after a window's start returns null from
// the window functions below (portfolio-level) or simply omits that ticker
// (position-level) — callers should treat that as "not enough history yet"
// and fall back to inception-to-date figures, not as an error.

export interface StoredSnapshotHolding {
  ticker: string;
  tokens: number;
  costBasisEth: number;
  blockchain?: string;
  investmentDate?: string;
  marketValueUsd?: number;
  gainUsd?: number;
  roiUsdPct?: number;
  roiEthPct?: number;
}

interface SnapshotRow {
  captured_at: string;
  nav_usd: number;
  holdings: StoredSnapshotHolding[];
}

export interface PortfolioWindowReturn {
  sinceDate: string;
  baselineCapturedAt: string;
  baselineNavUsd: number;
  navUsd: number;
  usdReturnPct: number;
  ethReturnPct: number;
}

export interface PositionWindowReturn {
  ticker: string;
  sinceDate: string;
  baselineCapturedAt: string;
  baselineValueUsd: number;
  valueUsd: number;
  gainUsd: number;
  roiUsdPct: number;
  roiEthPct?: number;
}

export function getMonthStartDate(d: Date = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// The earliest stored snapshot at/after `sinceDate` for a school — the
// closest available stand-in for "value at the start of this window", since
// the cron captures roughly hourly rather than exactly at midnight on a
// boundary date.
async function getBaselineSnapshot(schoolName: string, sinceDate: string): Promise<SnapshotRow | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("portfolio_snapshots")
    .select("captured_at, nav_usd, holdings")
    .eq("school_name", schoolName)
    .gte("captured_at", sinceDate)
    .order("captured_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as SnapshotRow | null) ?? null;
}

// A snapshot's own ETH/USD price, derived from its stored ETH treasury
// holding (marketValueUsd / tokens) rather than a separate historical-price
// lookup — avoids CoinGecko's 365-day free-tier window entirely, same
// reasoning as SEASON_START_ETH_USD in lib/seasonBaseline.ts.
function ethPriceFromHoldings(holdings: StoredSnapshotHolding[] | null | undefined): number | null {
  const ethHolding = (holdings ?? []).find((h) => h.ticker === "ETH");
  if (!ethHolding || !ethHolding.tokens || ethHolding.marketValueUsd == null) return null;
  return ethHolding.marketValueUsd / ethHolding.tokens;
}

export async function getPortfolioWindowReturn(
  schoolName: string,
  sinceDate: string,
  currentNavUsd: number,
  currentEthPriceUsd: number,
): Promise<PortfolioWindowReturn | null> {
  const baseline = await getBaselineSnapshot(schoolName, sinceDate);
  if (!baseline || !baseline.nav_usd || baseline.nav_usd <= 0) return null;

  const baselineEthPriceUsd = ethPriceFromHoldings(baseline.holdings);
  if (!baselineEthPriceUsd || baselineEthPriceUsd <= 0 || !currentEthPriceUsd || currentEthPriceUsd <= 0) return null;

  const usdReturnPct = ((currentNavUsd - baseline.nav_usd) / baseline.nav_usd) * 100;
  const baselineNavEth = baseline.nav_usd / baselineEthPriceUsd;
  const currentNavEth = currentNavUsd / currentEthPriceUsd;
  const ethReturnPct = ((currentNavEth - baselineNavEth) / baselineNavEth) * 100;

  return {
    sinceDate,
    baselineCapturedAt: baseline.captured_at,
    baselineNavUsd: baseline.nav_usd,
    navUsd: currentNavUsd,
    usdReturnPct,
    ethReturnPct,
  };
}

// Keyed by ticker. A ticker missing from the result means either the
// position didn't exist yet at `sinceDate` (its window return equals its
// inception return — nothing to diff against) or the school has no
// snapshot yet at/after that date at all.
export async function getPositionWindowReturns(
  schoolName: string,
  sinceDate: string,
  currentEthPriceUsd: number,
  currentHoldings: Array<{ ticker: string; marketValueUsd?: number }>,
): Promise<Record<string, PositionWindowReturn>> {
  const baseline = await getBaselineSnapshot(schoolName, sinceDate);
  if (!baseline) return {};

  const baselineEthPriceUsd = ethPriceFromHoldings(baseline.holdings);

  // Aggregate baseline holdings by ticker — a position can have multiple
  // purchase tranches sharing one ticker (see the same aggregation in
  // app/api/snapshot/route.ts's buy/sell diffing).
  const baselineByTicker = new Map<string, number>();
  for (const h of baseline.holdings ?? []) {
    if (h.ticker === "ETH" || h.marketValueUsd == null) continue;
    baselineByTicker.set(h.ticker, (baselineByTicker.get(h.ticker) ?? 0) + h.marketValueUsd);
  }

  const out: Record<string, PositionWindowReturn> = {};
  for (const h of currentHoldings) {
    if (h.ticker === "ETH" || h.marketValueUsd == null) continue;
    const baselineValueUsd = baselineByTicker.get(h.ticker);
    if (baselineValueUsd == null || baselineValueUsd <= 0) continue;

    const gainUsd = h.marketValueUsd - baselineValueUsd;
    const roiUsdPct = (gainUsd / baselineValueUsd) * 100;

    let roiEthPct: number | undefined;
    if (baselineEthPriceUsd && baselineEthPriceUsd > 0 && currentEthPriceUsd > 0) {
      const baselineValueEth = baselineValueUsd / baselineEthPriceUsd;
      const currentValueEth = h.marketValueUsd / currentEthPriceUsd;
      roiEthPct = ((currentValueEth - baselineValueEth) / baselineValueEth) * 100;
    }

    out[h.ticker] = {
      ticker: h.ticker,
      sinceDate,
      baselineCapturedAt: baseline.captured_at,
      baselineValueUsd,
      valueUsd: h.marketValueUsd,
      gainUsd,
      roiUsdPct,
      roiEthPct,
    };
  }
  return out;
}

export async function getPortfolioMonthToDateReturn(
  schoolName: string,
  currentNavUsd: number,
  currentEthPriceUsd: number,
): Promise<PortfolioWindowReturn | null> {
  return getPortfolioWindowReturn(schoolName, getMonthStartDate(), currentNavUsd, currentEthPriceUsd);
}

export async function getPortfolioSeasonToDateReturn(
  schoolName: string,
  currentNavUsd: number,
  currentEthPriceUsd: number,
): Promise<PortfolioWindowReturn | null> {
  return getPortfolioWindowReturn(schoolName, SEASON_START_DATE, currentNavUsd, currentEthPriceUsd);
}

export async function getPositionMonthToDateReturns(
  schoolName: string,
  currentEthPriceUsd: number,
  currentHoldings: Array<{ ticker: string; marketValueUsd?: number }>,
): Promise<Record<string, PositionWindowReturn>> {
  return getPositionWindowReturns(schoolName, getMonthStartDate(), currentEthPriceUsd, currentHoldings);
}

export async function getPositionSeasonToDateReturns(
  schoolName: string,
  currentEthPriceUsd: number,
  currentHoldings: Array<{ ticker: string; marketValueUsd?: number }>,
): Promise<Record<string, PositionWindowReturn>> {
  return getPositionWindowReturns(schoolName, SEASON_START_DATE, currentEthPriceUsd, currentHoldings);
}
