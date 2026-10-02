// Portfolio NAV at the start of the current season (2026-2027), provided
// directly by DormDAO — the baseline for computing this SEASON's USD/ETH
// return, instead of each position's original purchase date. Using purchase
// date conflates all-time return with season return (a position bought in
// 2023 and still held would otherwise show its 2023-to-now return on the
// "Current Season" panel), and can hit CoinGecko's 365-day historical-price
// limit for older positions. A fixed, recent baseline date avoids both.
//
// Updated for the 2026-2027 season rollover (previously 2025-2026's values
// below) — these are each school's end-of-2025-26-season NAV, i.e. this
// season's opening NAV. The 2025-26 season itself becomes a fixed historical
// snapshot once its own archive tab + leaderboard-parsing update land (see
// lib/sheets.ts's parseLeaderboard/parseHistoricalLeaderboard and
// fetchSheetsData's '24-'25 Standings / '23-'24 Standings tab fetches) —
// not done here, since it depends on how DormDAO's sheet structures that
// new archive tab.
export const SEASON_START_DATE = "2026-10-01";

// Provided directly rather than fetched from CoinGecko's historical API —
// exact and doesn't depend on that endpoint's 365-day free-tier window.
// (ETH/USD on 2026-10-01 per CoinGecko's historical-price API: $2,684.71.)
export const SEASON_START_ETH_USD = 2684.71;

export const SEASON_START_NAV_USD: Record<string, number> = {
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
