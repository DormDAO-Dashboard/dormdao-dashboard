import { createServiceClient } from "./supabase/server";
import { slugify } from "./utils";
import type { Holding, ExitedHolding } from "./types";
import type { SchoolRowWithHoldings } from "./sheets";

export interface PositionRow {
  id: string;
  school: string;
  ticker: string;
  blockchain: string;
  tokens: number;
  cost_basis_eth: number;
  purchase_price_usd: number | null;
  investment_date: string;
  created_at: string;
  updated_at: string;
}

type PriceMap = Record<string, { usd: number; usd_24h_change: number }>;

// Common shape both admin-entered `positions` rows and sheet-parsed
// `Holding`s reduce down to — computeSchoolMetrics() doesn't care which
// source they came from.
export interface RawPosition {
  ticker: string;
  blockchain: string;
  tokens: number;
  costBasisEth: number;
  purchasePriceUsd: number | null;
  investmentDate: string;
}

export async function getPositionsBySchool(): Promise<Record<string, PositionRow[]>> {
  const service = createServiceClient();
  const { data, error } = await service.from("positions").select("*");
  if (error || !data) return {};

  const bySchool: Record<string, PositionRow[]> = {};
  for (const row of data as PositionRow[]) {
    if (!bySchool[row.school]) bySchool[row.school] = [];
    bySchool[row.school].push(row);
  }
  return bySchool;
}

// Builds a school's current-season row entirely from a list of fixed
// positions + live prices — no spreadsheet aggregate formulas involved. A
// ticker of "ETH" represents idle treasury: it counts toward NAV and dilutes
// % deployed, but has no cost basis / return of its own (mirrors how the
// sheet-derived path already treats the fund's own ETH balance — see
// CLAUDE.md). `extras` carries through exited/NFT holdings for callers that
// have them (the sheet-holdings path does; admin-entered positions don't).
export function computeSchoolMetrics(
  name: string,
  positions: RawPosition[],
  prices: PriceMap,
  historicalEth: Record<string, number>,
  extras?: { exitedHoldings?: ExitedHolding[]; nftHoldings?: Holding[] }
): SchoolRowWithHoldings {
  const ethPriceUsd = prices.ETH?.usd ?? 0;

  let nav = 0;
  let idleEthValueUsd = 0;
  let totalCostBasisUsd = 0;
  let totalCurrentValueUsdNonIdle = 0;
  let totalCostBasisEth = 0;
  let totalCurrentValueEthNonIdle = 0;

  const holdings: Holding[] = positions.map((p) => {
    const ticker = p.ticker.toUpperCase();
    const currentPriceUsd = prices[ticker]?.usd ?? 0;
    const currentValueUsd = p.tokens * currentPriceUsd;
    nav += currentValueUsd;

    if (ticker === "ETH") {
      idleEthValueUsd += currentValueUsd;
      return {
        ticker,
        blockchain: p.blockchain || "Ethereum",
        tokens: p.tokens,
        entryFdv: "",
        costBasisEth: 0,
        pctOfPortfolio: 0,
        investmentDate: p.investmentDate,
        marketValueUsd: currentValueUsd,
      };
    }

    // Purchase price: explicit override if provided, else derived from the
    // ETH cost basis + that day's historical ETH/USD price — same math
    // already used client-side in HoldingsTableClient's purchasePriceOf().
    const purchasePriceUsd =
      p.purchasePriceUsd ??
      (p.costBasisEth > 0 && historicalEth[p.investmentDate] && p.tokens > 0
        ? (p.costBasisEth * historicalEth[p.investmentDate]) / p.tokens
        : null);
    const costBasisUsd = purchasePriceUsd != null ? p.tokens * purchasePriceUsd : null;
    const gainUsd = costBasisUsd != null ? currentValueUsd - costBasisUsd : undefined;
    const roiUsdPct =
      costBasisUsd && costBasisUsd > 0 ? ((currentValueUsd - costBasisUsd) / costBasisUsd) * 100 : undefined;
    const currentValueEth = ethPriceUsd > 0 ? currentValueUsd / ethPriceUsd : null;
    const roiEthPct =
      p.costBasisEth > 0 && currentValueEth !== null
        ? ((currentValueEth - p.costBasisEth) / p.costBasisEth) * 100
        : undefined;

    if (costBasisUsd != null) totalCostBasisUsd += costBasisUsd;
    totalCurrentValueUsdNonIdle += currentValueUsd;
    if (p.costBasisEth > 0) totalCostBasisEth += p.costBasisEth;
    if (currentValueEth !== null) totalCurrentValueEthNonIdle += currentValueEth;

    return {
      ticker,
      blockchain: p.blockchain,
      tokens: p.tokens,
      entryFdv: "",
      costBasisEth: p.costBasisEth,
      pctOfPortfolio: 0,
      investmentDate: p.investmentDate,
      gainUsd,
      roiUsdPct,
      roiEthPct,
      marketValueUsd: currentValueUsd,
    };
  });

  for (const h of holdings) {
    h.pctOfPortfolio = nav > 0 ? ((h.marketValueUsd ?? 0) / nav) * 100 : 0;
  }

  const usdReturn =
    totalCostBasisUsd > 0 ? ((totalCurrentValueUsdNonIdle - totalCostBasisUsd) / totalCostBasisUsd) * 100 : 0;
  const ethReturn =
    totalCostBasisEth > 0 ? ((totalCurrentValueEthNonIdle - totalCostBasisEth) / totalCostBasisEth) * 100 : 0;
  // % of NAV that isn't sitting idle in ETH. Schools with no ETH-ticker row
  // (no idle balance tracked) default to fully deployed.
  const pctDeployed = nav > 0 ? (1 - idleEthValueUsd / nav) * 100 : 0;

  return {
    rank: 0, // recomputed by the caller after merging with sheet-trusted schools
    name,
    slug: slugify(name),
    nav,
    usdReturn,
    ethReturn,
    avgEntryFdv: 0, // not derivable without token-supply data — see SchoolCard "—" handling
    pctDeployed,
    holdings,
    exitedHoldings: extras?.exitedHoldings ?? [],
    nftHoldings: extras?.nftHoldings ?? [],
  };
}

export function computeSchoolFromPositions(
  name: string,
  positions: PositionRow[],
  prices: PriceMap,
  historicalEth: Record<string, number>
): SchoolRowWithHoldings {
  const raw: RawPosition[] = positions.map((p) => ({
    ticker: p.ticker,
    blockchain: p.blockchain,
    tokens: p.tokens,
    costBasisEth: p.cost_basis_eth,
    purchasePriceUsd: p.purchase_price_usd,
    investmentDate: p.investment_date,
  }));
  return computeSchoolMetrics(name, raw, prices, historicalEth);
}

// Fallback path for a school whose LEADERBOARD row is currently broken but
// whose own tab (and therefore Holding[] parsed from it) is fine — computes
// NAV/return/%deployed from that instead of trusting a #VALUE! cell.
export function computeSchoolFromHoldings(
  name: string,
  holdings: Holding[],
  exitedHoldings: ExitedHolding[],
  nftHoldings: Holding[],
  prices: PriceMap,
  historicalEth: Record<string, number>
): SchoolRowWithHoldings {
  const raw: RawPosition[] = holdings.map((h) => ({
    ticker: h.ticker,
    blockchain: h.blockchain,
    tokens: h.tokens,
    costBasisEth: h.costBasisEth,
    purchasePriceUsd: null,
    investmentDate: h.investmentDate,
  }));
  return computeSchoolMetrics(name, raw, prices, historicalEth, { exitedHoldings, nftHoldings });
}
