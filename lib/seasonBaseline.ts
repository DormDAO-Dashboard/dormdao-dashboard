// Portfolio NAV at the start of the current season (2025-2026), provided
// directly by DormDAO — the baseline for computing this SEASON's USD/ETH
// return, instead of each position's original purchase date. Using purchase
// date conflates all-time return with season return (a position bought in
// 2023 and still held would otherwise show its 2023-to-now return on the
// "Current Season" panel), and can hit CoinGecko's 365-day historical-price
// limit for older positions. A fixed, recent baseline date avoids both.
export const SEASON_START_DATE = "2025-10-01";

// Provided directly rather than fetched from CoinGecko's historical API —
// exact and doesn't depend on that endpoint's 365-day free-tier window.
export const SEASON_START_ETH_USD = 4144.23;

export const SEASON_START_NAV_USD: Record<string, number> = {
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
