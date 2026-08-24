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
