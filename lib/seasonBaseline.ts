import { slugify } from "./utils";
import type { SchoolRow } from "./types";

// Portfolio NAV at the start of the current season (2026-2027), provided
// directly by DormDAO — the baseline for computing this SEASON's USD/ETH
// return, instead of each position's original purchase date. Using purchase
// date conflates all-time return with season return (a position bought in
// 2023 and still held would otherwise show its 2023-to-now return on the
// "Current Season" panel), and can hit CoinGecko's 365-day historical-price
// limit for older positions. A fixed, recent baseline date avoids both.
//
// Updated for the 2026-2027 season rollover — these are each school's
// opening NAV for the new season (not always equal to 2025-26's closing NAV;
// see getSchools2526 below for where the two diverge). 2025-2026 itself is
// now a fixed historical snapshot too, computed by getSchools2526 below from
// DormDAO's given start/end NAVs — not sheet-parsed from its own archive tab
// the way 24-25/23-24 are (lib/sheets.ts's parseHistoricalLeaderboard +
// fetchSheetsData's '24-'25 Standings / '23-'24 Standings tab fetches),
// since no such tab exists for it.
export const SEASON_START_DATE = "2026-10-01";

// Provided directly rather than fetched from CoinGecko's historical API —
// exact and doesn't depend on that endpoint's 365-day free-tier window.
// (ETH/USD on 2026-10-01 per CoinGecko's historical-price API: $2,684.71.)
export const SEASON_START_ETH_USD = 2684.71;

export const SEASON_START_NAV_USD: Record<string, number> = {
  "Oregon": 64246.00,
  "Penn": 76160.00,
  "Dartmouth": 49154.00,
  "Texas": 25897.00,
  "Michigan": 57585.00,
  "NYU": 77973.00,
  "Cornell": 96172.00,
  "Columbia": 114817.00,
  "Waterloo": 103055.00,
  "Berkeley": 75213.00,
  "Purdue": 73937.00,
  "Vanderbilt": 105803.00,
  "Boston College": 130064.00,
  "Cambridge": 108199.00,
  "USC": 128842.00,
  "Villanova": 169464.00,
  "St. Andrews": 138216.00,
};

// Each school's SEASON_START_NAV_USD above, already converted to ETH, given
// directly rather than derived at runtime (baselineNavUsd / SEASON_START_ETH_USD)
// — a fixed value, same spirit as SEASON_START_ETH_USD itself, and never
// re-fetched or recomputed from a live price for the "initial" side of any
// season-return calculation. (Matches dividing by SEASON_START_ETH_USD to
// within rounding — these are just the authoritative figures to use as-is.)
export const SEASON_START_NAV_ETH: Record<string, number> = {
  "Oregon": 23.93052146,
  "Penn": 28.36819749,
  "Dartmouth": 18.30885341,
  "Texas": 9.646260639,
  "Michigan": 21.44918756,
  "NYU": 29.04328972,
  "Cornell": 35.82201658,
  "Columbia": 42.76695257,
  "Waterloo": 38.3860019,
  "Berkeley": 28.0155021,
  "Purdue": 27.54018489,
  "Vanderbilt": 39.40959255,
  "Boston College": 48.44608769,
  "Cambridge": 40.30212872,
  "USC": 47.9910885,
  "Villanova": 63.12175621,
  "St. Andrews": 51.48271289,
};

// ── 2025-2026 season, frozen ────────────────────────────────────────────────
// With the 2026-2027 rollover, 2025-2026 needs to show up as a fixed
// historical season like 24-25/23-24 — but unlike those (each backed by its
// own sheet archive tab), DormDAO gave simple start/end NAV snapshots
// instead of a tab to parse. So this computes 2025-2026's frozen USD/ETH
// returns directly, once, from those two NAV snapshots — same formula as
// the live season-baseline calc above (return = final/initial - 1, ETH
// return computed by converting both NAVs through their respective ETH
// prices), just with both ends fixed instead of one end being "today".

// 2025-2026's own opening NAV (what SEASON_START_NAV_USD held before the
// 2026-2027 rollover overwrote it above) — used only to compute this frozen
// season's return, never for any live calculation.
const SEASON_2526_START_NAV_USD: Record<string, number> = {
  "Oregon": 84423.00,
  "Penn": 116830.00,
  "Dartmouth": 91578.00,
  "Texas": 80428.00,
  "Michigan": 83131.00,
  "NYU": 100567.00,
  "Cornell": 146411.00,
  "Columbia": 138862.00,
  "Waterloo": 143509.00,
  "Berkeley": 124734.00,
  "Purdue": 77429.00,
  "Vanderbilt": 109762.00,
  "Boston College": 137713.00,
  "Cambridge": 171667.00,
  "USC": 165769.00,
  "Villanova": 165769.00,
  "St. Andrews": 165769.00,
};
const SEASON_2526_START_ETH_USD = 4144.23;

// 2025-2026's closing NAV — identical to SEASON_START_NAV_USD above except
// Oregon (corrected to 64,246 as 2026-2027's actual opening NAV; its
// 2025-2026 closing NAV was 50,758).
const SEASON_2526_END_NAV_USD: Record<string, number> = {
  "Oregon": 50758.00,
  "Penn": 76160.00,
  "Dartmouth": 49154.00,
  "Texas": 25897.00,
  "Michigan": 57585.00,
  "NYU": 77973.00,
  "Cornell": 96172.00,
  "Columbia": 114817.00,
  "Waterloo": 103055.00,
  "Berkeley": 75213.00,
  "Purdue": 73937.00,
  "Vanderbilt": 105803.00,
  "Boston College": 130064.00,
  "Cambridge": 108199.00,
  "USC": 128842.00,
  "Villanova": 169464.00,
  "St. Andrews": 138216.00,
};
const SEASON_2526_END_ETH_USD = 2684.71;

// Ranked by ETH return descending, matching the site's existing convention
// for every other season panel (current season, 24-25, 23-24).
export function getSchools2526(): SchoolRow[] {
  const rows = Object.entries(SEASON_2526_END_NAV_USD).map(([name, endNav]) => {
    const startNav = SEASON_2526_START_NAV_USD[name];
    const usdReturn = (endNav / startNav - 1) * 100;
    const endNavEth = endNav / SEASON_2526_END_ETH_USD;
    const startNavEth = startNav / SEASON_2526_START_ETH_USD;
    const ethReturn = (endNavEth / startNavEth - 1) * 100;
    return {
      name,
      slug: slugify(name),
      nav: endNav,
      usdReturn,
      ethReturn,
      // Not derivable from just start/end NAV snapshots — "—" client-side
      // (see LeaderboardClient's `s.pctDeployed > 0 ? ... : "—"` guard)
      // rather than a fabricated 0%/0.
      avgEntryFdv: 0,
      pctDeployed: 0,
    };
  });
  rows.sort((a, b) => b.ethReturn - a.ethReturn);
  return rows.map((r, i): SchoolRow => ({ ...r, rank: i + 1 }));
}

// All-Time (Since Inception) baselines, grouped by cohort — how much ETH
// (and its USD cost at time of contribution) a school started with, based on
// when its Sub DAO opened (each school's own "Sub DAO Opening" cell, which
// is directly entered and reliable regardless of the LEADERBOARD tab's
// health — see lib/sheets.ts's extractYear). Both the ETH amount and USD
// cost are given directly, so All-Time return needs no historical price
// lookup or conversion at all, unlike the season baseline above.
export const INCEPTION_BASELINE_PRE_2024 = {
  // 25 ETH @ $1,670.998956 + 15 ETH @ $2,597.341152
  ethAmount: 40,
  usdCost: 80735.09118,
};

export const INCEPTION_BASELINE_2024 = {
  // 40 ETH @ $2,597.341152
  ethAmount: 40,
  usdCost: 103893.646067,
};

// Schools whose Sub DAO opened in 2025 (USC, Villanova, St. Andrews) have no
// separate inception baseline — they joined this season, so their All-Time
// performance is defined to equal their Current Season performance.
export function inceptionBaselineForYear(year: number | null): { ethAmount: number; usdCost: number } | null {
  if (year == null) return null;
  if (year < 2024) return INCEPTION_BASELINE_PRE_2024;
  if (year === 2024) return INCEPTION_BASELINE_2024;
  return null;
}
