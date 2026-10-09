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
  // Final: $104,817. Root cause found — Jack's own personal spreadsheet
  // had a broken ETH-total calc that the recent HYPE trims exposed, which
  // is what produced the wrong $114,817 figure he'd been working from.
  // This system's own Oct-1 snapshot ($104,367.67) was right all along.
  "Columbia": 104817.00,
  "Waterloo": 103055.00,
  "Berkeley": 75213.00,
  "Purdue": 73937.00,
  "Vanderbilt": 105803.00,
  "Boston College": 130064.00,
  "Cambridge": 108199.00,
  "USC": 128842.00,
  "Villanova": 169464.00,
  // Final: $134,327.44 — this system's own Oct-1 snapshot figure. Root
  // cause: Jack's personal spreadsheet had a broken ETH-total calc,
  // exposed by the recent HYPE trims, which produced both wrong numbers
  // he'd floated before this one ($138,216, then $130,974).
  "St. Andrews": 134327.44,
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
  "Columbia": 39.04220568,
  "Waterloo": 38.3860019,
  "Berkeley": 28.0155021,
  "Purdue": 27.54018489,
  "Vanderbilt": 39.40959255,
  "Boston College": 48.44608769,
  "Cambridge": 40.30212872,
  "USC": 47.9910885,
  "Villanova": 63.12175621,
  "St. Andrews": 50.03424578,
};

// ── 2025-2026 season, frozen ────────────────────────────────────────────────
// With the 2026-2027 rollover, 2025-2026 needs to show up as a fixed
// historical season like 24-25/23-24 — but unlike those (each backed by its
// own sheet archive tab), DormDAO gave this directly as a finished table:
// NAV, USD return, ETH return, and % deployed, all as of 2025-2026's close.
// Stored verbatim rather than re-derived from separate start/end NAV
// snapshots — an earlier version computed usdReturn/ethReturn from two NAV
// dicts, but came out slightly off for a few schools (Vanderbilt, Purdue,
// Columbia, NYU, Michigan) versus DormDAO's own figures, so these four
// fields are now each given directly instead of derived.
const SEASON_2526_DATA: Record<string, { nav: number; usdReturn: number; ethReturn: number; pctDeployed: number }> = {
  "Villanova":      { nav: 169464, usdReturn: 2.23,   ethReturn: 57.80,  pctDeployed: 85.73 },
  "Vanderbilt":     { nav: 105803, usdReturn: -3.78,  ethReturn: 48.52,  pctDeployed: 86.15 },
  "Purdue":         { nav: 73937,  usdReturn: -4.88,  ethReturn: 46.84,  pctDeployed: 52.38 },
  "Boston College": { nav: 130064, usdReturn: -5.55,  ethReturn: 45.79,  pctDeployed: 73.52 },
  "St. Andrews":    { nav: 138216, usdReturn: -16.62, ethReturn: 28.71,  pctDeployed: 70.10 },
  "Columbia":       { nav: 114817, usdReturn: -17.22, ethReturn: 27.78,  pctDeployed: 62.01 },
  "USC":            { nav: 128842, usdReturn: -22.28, ethReturn: 19.98,  pctDeployed: 59.17 },
  "Oregon":         { nav: 64246,  usdReturn: -23.90, ethReturn: 17.47,  pctDeployed: 71.35 },
  "NYU":            { nav: 77973,  usdReturn: -25.70, ethReturn: 14.70,  pctDeployed: 90.66 },
  "Waterloo":       { nav: 103055, usdReturn: -28.19, ethReturn: 10.85,  pctDeployed: 75.04 },
  "Michigan":       { nav: 57585,  usdReturn: -32.66, ethReturn: 3.95,   pctDeployed: 75.89 },
  "Cornell":        { nav: 96172,  usdReturn: -34.31, ethReturn: 1.40,   pctDeployed: 43.46 },
  "Penn":           { nav: 76160,  usdReturn: -34.81, ethReturn: 0.63,   pctDeployed: 99.16 },
  "Cambridge":      { nav: 108199, usdReturn: -36.97, ethReturn: -2.71,  pctDeployed: 19.94 },
  "Berkeley":       { nav: 75213,  usdReturn: -39.70, ethReturn: -6.92,  pctDeployed: 21.01 },
  "Dartmouth":      { nav: 49154,  usdReturn: -46.33, ethReturn: -17.15, pctDeployed: 62.02 },
  "Texas":          { nav: 25897,  usdReturn: -67.80, ethReturn: -50.30, pctDeployed: 85.51 },
};

// Ranked by ETH return descending, matching the site's existing convention
// for every other season panel (current season, 24-25, 23-24).
export function getSchools2526(): SchoolRow[] {
  const rows = Object.entries(SEASON_2526_DATA).map(([name, d]) => ({
    name,
    slug: slugify(name),
    nav: d.nav,
    usdReturn: d.usdReturn,
    ethReturn: d.ethReturn,
    avgEntryFdv: 0,
    pctDeployed: d.pctDeployed,
  }));
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

export const INCEPTION_BASELINE_2025 = {
  // 40 ETH, cohort cost basis at 2025 Sub DAO opening
  ethAmount: 40,
  usdCost: 165893,
};

export function inceptionBaselineForYear(year: number | null): { ethAmount: number; usdCost: number } | null {
  if (year == null) return null;
  if (year < 2024) return INCEPTION_BASELINE_PRE_2024;
  if (year === 2024) return INCEPTION_BASELINE_2024;
  if (year === 2025) return INCEPTION_BASELINE_2025;
  return null;
}
