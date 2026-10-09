import { SEASON_START_DATE } from "@/lib/seasonBaseline";
import { getBaselineSnapshot, ethPriceFromHoldings } from "@/lib/snapshotReturns";
import { parseDateMsAsc } from "@/lib/holdings";
import type { Holding, ExitedHolding } from "@/lib/types";

const SEASON_START_MS = parseDateMsAsc(SEASON_START_DATE);

export interface TokenSeasonRow {
  ticker: string;
  // Current tokens held, or null once a position is fully exited (its
  // row still exists — "every token tracked" — but there's nothing left
  // to size).
  tokens: number | null;
  // Scaled Oct-1 baseline value, or null when this ticker has no
  // season-start baseline at all (bought after the season started).
  baselineValueUsd: number | null;
  valueNowUsd: number | null;
  gainUsd: number | null;
  roiUsdPct: number | null;
  roiEthPct: number | null;
  // "active": held continuously since the baseline (trims folded in).
  // "exited": fully sold during the season.
  // "new": no season-start baseline — bought after SEASON_START_DATE, so
  // its since-purchase figures ARE its season figures.
  status: "active" | "exited" | "new";
}

export interface SeasonPerformanceResult {
  rows: Record<string, TokenSeasonRow>;
  // false when the fixed Leaderboard baseline and this system's own
  // recorded Oct-1 NAV disagree by more than RECONCILE_THRESHOLD — e.g.
  // Columbia and Texas, both off by 9-10% as of 2026-10, which traces to a
  // stale/out-of-sync NAV cell on their sheet tabs, not normal price noise.
  // Scaling every token by that large a factor just to force-match a
  // baseline that's itself likely wrong would misrepresent each token's own
  // performance, so in that case every row below falls back to the actual
  // recorded snapshot value (scaleFactor 1) instead, and this flag tells
  // the UI to say so rather than silently showing a number that doesn't
  // match the Leaderboard.
  reconciledToLeaderboard: boolean;
}

// Above this gap between the fixed Leaderboard baseline and this system's
// own recorded Oct-1 NAV, the fixed baseline is treated as unreliable for
// that school rather than something to force every token to match. The 14
// of 17 schools checked on 2026-10-09 all fell within 0.26%; Columbia,
// Texas and St. Andrews were 2.8-10.3% off — a different kind of problem
// (a stale sheet cell), not price noise.
const RECONCILE_THRESHOLD = 0.01;

// Manual, sourced Oct-1 baseline overrides for tickers the daily snapshot
// has no historical data for — specifically NFTs bought before
// nft_holdings started being captured (see supabase-nft-snapshot-
// migration.sql, added 2026-10-09). Keyed by ticker, USD value as of
// SEASON_START_DATE.
//
// MILADY: Texas's Milady #7626 hasn't traded since its original 2024
// purchase (confirmed via Blur's activity log — last Sale/Transfer both
// dated 2y before this check), so there's no actual transaction to price it
// off of at Oct 1. Used the Milady Maker collection's floor price instead,
// read off CoinGecko's own historical chart: 0.999 ETH at Oct 1, 2026,
// 17:05:26 PDT, converted at SEASON_START_ETH_USD ($2,684.71) = $2,682.03.
// Sanity check: adding this to Texas's liquid-only baseline ($23,228.91)
// gives $25,910.94 against the hardcoded SEASON_START_NAV_USD figure of
// $25,897.00 — a 0.05% gap, confirming this NFT was the entire explanation
// for Texas's reconciliation gap and that Jack's figure was correct all
// along (unlike Columbia's, which was a genuine typo).
const MANUAL_SEASON_BASELINES_USD: Record<string, number> = {
  MILADY: 2682.03,
};

// Per-token season performance, scaled so every row's baseline sums to
// `fixedBaselineNavUsd` — the Leaderboard's own hardcoded season-start NAV
// (lib/seasonBaseline.ts's SEASON_START_NAV_USD), not whatever this
// system's own first daily snapshot happened to compute that morning. The
// two numbers are close but not identical (the fixed figure is DormDAO's
// own reconciled opening NAV), so every token's real Oct-1 snapshot value
// is scaled by the same factor — preserving each token's actual relative
// weight — so the table's totals land exactly on the Leaderboard's number
// instead of being off by a small, unexplained margin.
//
// Trims (partial sells of a still-held position) fold their realized
// proceeds into that ticker's one row, added to its current live value, so
// a trim doesn't look like an unexplained loss against the pre-trim
// baseline. A full exit (nothing left held) gets its own row instead, with
// its frozen sale value standing in for "value now". A ticker bought and
// fully exited within the season (no baseline either side) falls back to
// its own since-purchase figures, same convention as a fresh buy.
export async function getScaledTokenSeasonPerformance(
  schoolName: string,
  fixedBaselineNavUsd: number | undefined,
  currentEthPriceUsd: number,
  mergedHoldings: Holding[],
  exitedHoldings: ExitedHolding[],
): Promise<SeasonPerformanceResult> {
  const baseline = await getBaselineSnapshot(schoolName, SEASON_START_DATE);

  const baselineByTicker = new Map<string, number>();
  for (const h of baseline?.holdings ?? []) {
    if (h.marketValueUsd != null) {
      baselineByTicker.set(h.ticker, (baselineByTicker.get(h.ticker) ?? 0) + h.marketValueUsd);
    }
  }
  // Manual overrides only fill in a ticker the real snapshot data has
  // nothing for — never override an actual recorded value.
  for (const [ticker, usd] of Object.entries(MANUAL_SEASON_BASELINES_USD)) {
    if (!baselineByTicker.has(ticker)) baselineByTicker.set(ticker, usd);
  }

  // Summed directly from what's actually in baselineByTicker (liquid + NFT,
  // post-concat in getBaselineSnapshot) rather than trusting the
  // separately-stored nav_usd field to match it — nav_usd is written at
  // capture time from the school's sheet-derived NAV, which doesn't include
  // NFT value, so relying on it here would quietly decouple the scale
  // factor from the very total it's supposed to be scaling.
  const baselineTotalUsd = Array.from(baselineByTicker.values()).reduce((s, v) => s + v, 0);
  const rawScaleFactor = fixedBaselineNavUsd && baselineTotalUsd > 0
    ? fixedBaselineNavUsd / baselineTotalUsd
    : 1;
  const reconciledToLeaderboard = Math.abs(rawScaleFactor - 1) <= RECONCILE_THRESHOLD;
  const scaleFactor = reconciledToLeaderboard ? rawScaleFactor : 1;
  const baselineEthPriceUsd = baseline ? ethPriceFromHoldings(baseline.holdings) : null;

  function scaledBaseline(ticker: string): number | undefined {
    const raw = baselineByTicker.get(ticker);
    return raw != null ? raw * scaleFactor : undefined;
  }

  function computeReturn(baselineValueUsd: number, valueNowUsd: number) {
    const gainUsd = valueNowUsd - baselineValueUsd;
    const roiUsdPct = baselineValueUsd > 0 ? (gainUsd / baselineValueUsd) * 100 : null;
    let roiEthPct: number | null = null;
    if (baselineEthPriceUsd && baselineEthPriceUsd > 0 && currentEthPriceUsd > 0) {
      const baselineValueEth = baselineValueUsd / baselineEthPriceUsd;
      const valueNowEth = valueNowUsd / currentEthPriceUsd;
      roiEthPct = ((valueNowEth - baselineValueEth) / baselineValueEth) * 100;
    }
    return { gainUsd, roiUsdPct, roiEthPct };
  }

  // Only exits dated on/after the season start count as this season's
  // realized proceeds. school.exitedHoldings is sheet-derived and not
  // itself season-scoped — a trim from before Oct 1 is already baked into
  // both the baseline snapshot AND the current holding (same reduced token
  // count either side), so folding its proceeds in here too would double
  // count it. Concretely: St. Andrews trimmed 50% of a HYPE lot on Sep 4
  // (a real Programmatic Liquidation Policy trim, not stale data — the
  // remaining holding is exactly half of what was trimmed), weeks before
  // the season began, so that trim must never show up as this season's
  // realized gain.
  const seasonExitedHoldings = exitedHoldings.filter((ex) => parseDateMsAsc(ex.exitDate) >= SEASON_START_MS);

  // This season's realized proceeds per ticker, summed across however many
  // trim/exit rows that ticker has (a position can be trimmed more than
  // once before a final exit).
  const exitsByTicker = new Map<string, { valueUsd: number; sinceBuyGainUsd: number; sinceBuyRoiUsdPct: number }>();
  for (const ex of seasonExitedHoldings) {
    const prev = exitsByTicker.get(ex.ticker);
    exitsByTicker.set(ex.ticker, {
      valueUsd: (prev?.valueUsd ?? 0) + ex.marketValueUsd,
      sinceBuyGainUsd: (prev?.sinceBuyGainUsd ?? 0) + ex.gainUsd,
      // Weighted by this exit's own value — good enough for the no-baseline
      // fallback case, which is already an approximation once more than one
      // trim is involved.
      sinceBuyRoiUsdPct: ex.roiUsdPct,
    });
  }

  const out: Record<string, TokenSeasonRow> = {};

  for (const h of mergedHoldings) {
    const exits = exitsByTicker.get(h.ticker);
    const valueNowUsd = (h.marketValueUsd ?? 0) + (exits?.valueUsd ?? 0);
    const baselineValueUsd = scaledBaseline(h.ticker);

    if (baselineValueUsd != null && baselineValueUsd > 0) {
      out[h.ticker] = {
        ticker: h.ticker,
        tokens: h.tokens,
        baselineValueUsd,
        valueNowUsd,
        status: "active",
        ...computeReturn(baselineValueUsd, valueNowUsd),
      };
    } else {
      // No season-start baseline — bought after SEASON_START_DATE.
      out[h.ticker] = {
        ticker: h.ticker,
        tokens: h.tokens,
        baselineValueUsd: null,
        valueNowUsd: h.marketValueUsd ?? null,
        gainUsd: h.gainUsd ?? null,
        roiUsdPct: h.roiUsdPct ?? null,
        roiEthPct: h.roiEthPct ?? null,
        status: "new",
      };
    }
  }

  // Fully exited tickers — nothing left in mergedHoldings for these. Also
  // iterates seasonExitedHoldings, not the raw list: exitsByTicker only has
  // entries for season-dated exits, so a ticker whose only activity
  // predates the season (fully sold before Oct 1, nothing held, no
  // this-season event) correctly gets no row at all here, rather than
  // crashing on a missing exitsByTicker entry.
  for (const ex of seasonExitedHoldings) {
    if (out[ex.ticker]) continue; // already covered above (still partially held)
    const exits = exitsByTicker.get(ex.ticker)!;
    const baselineValueUsd = scaledBaseline(ex.ticker);

    if (baselineValueUsd != null && baselineValueUsd > 0) {
      out[ex.ticker] = {
        ticker: ex.ticker,
        tokens: null,
        baselineValueUsd,
        valueNowUsd: exits.valueUsd,
        status: "exited",
        ...computeReturn(baselineValueUsd, exits.valueUsd),
      };
    } else {
      // Bought and fully sold within the season — no baseline either side.
      out[ex.ticker] = {
        ticker: ex.ticker,
        tokens: null,
        baselineValueUsd: null,
        valueNowUsd: exits.valueUsd,
        gainUsd: exits.sinceBuyGainUsd,
        roiUsdPct: exits.sinceBuyRoiUsdPct,
        roiEthPct: null,
        status: "new",
      };
    }
  }

  return { rows: out, reconciledToLeaderboard };
}
