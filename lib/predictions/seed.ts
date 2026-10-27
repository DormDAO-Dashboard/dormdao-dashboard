import type { Pitch, Trade, Round } from "@/lib/predictions/types";

// Rounds 5–7 from the OBG "Prediction Markets #N" Medium posts. Used until the
// Supabase project is connected; supabase/seed.sql mirrors it. Thesis text is
// a short summary — the full write-up is linked from each round. No trades:
// the posts don't give fill sizes, so fund $ stay empty until real fills are
// entered.

const MEDIUM = "https://medium.com/oregon-blockchain-group";

export const SEED_ROUNDS: Round[] = [
  {
    number: 5,
    publishedAt: "2026-10-07",
    mediumUrl: `${MEDIUM}/oregon-blockchain-group-prediction-markets-5-d266c8cd9cfc`,
    summary: "September CPI's 3.6% bucket is overpriced, Gemini isn't taking #1 in six days, and Trump's approval dips into 38.2–38.4%.",
    selectedPitchId: "p5-econ-cpi-36",
  },
  {
    number: 6,
    publishedAt: "2026-10-14",
    mediumUrl: `${MEDIUM}/oregon-blockchain-group-prediction-markets-6-00edb860a50c`,
    summary: "Bitcoin holding $82k, Q3 GDP beating 3.5% on GDPNow, and a tighter Brazil runoff.",
    selectedPitchId: "p6-ai-btc-82k",
  },
  {
    number: 7,
    publishedAt: "2026-10-21",
    mediumUrl: `${MEDIUM}/oregon-blockchain-group-prediction-markets-7-e9b146348a37`,
    summary: "Fading Anthropic for best AI model at month-end, Q3 GDP clearing 3.0%, and a Texas split ticket.",
    selectedPitchId: "p7-ai-anthropic",
  },
];

const base = { sellLimit: null, sellLimitBefore: null, stopLoss: null, votes: null } as const;

export const SEED_PITCHES: Pitch[] = [
  // ── Round 5 ────────────────────────────────────────────────────────────
  {
    ...base,
    id: "p5-econ-cpi-36",
    roundNumber: 5,
    sector: "economics",
    analyst: "Nick Sakys",
    marketTitle: "September Inflation US — Annual (CPI-U, Unadjusted)",
    outcomeLabel: "3.6%",
    venue: "synthesis",
    market: { source: "polymarket", slug: "will-annual-inflation-be-3pt6-in-september-2026" },
    side: "NO",
    entryPrice: 0.53,
    impliedPrice: 1,
    sellLimit: 0.62,
    exitBy: "2026-10-14",
    thesis: [
      "A 0.1pp-wide bucket priced near 49% implies a forecast error of only 0.07–0.08pp, tighter than the ~0.09–0.10pp average miss of both Street consensus and the Cleveland Fed. A bottom-up build from gas prices and CPI-U weights gives ~41% for 3.6%; a track-record-weighted blend gives ~35%.",
      "Core (79% of the basket) and energy decide the bucket, and a small miss either way lands on 3.5% or 3.7%, where NO wins. Plan: hold to the Oct 14 print (~89% return) or limit sell at 62% (~17%) if the price corrects first.",
    ],
    status: "closed",
  },
  {
    ...base,
    id: "p5-ai-gemini-top",
    roundNumber: 5,
    sector: "ai_tech",
    analyst: "Matthew Stone",
    marketTitle: "Top AI Model on October 12 (LMSYS Chatbot Arena)",
    outcomeLabel: "Gemini",
    venue: "kalshi",
    market: { source: "kalshi", ticker: "KXTOPMODEL-26OCT12-GEMI" },
    side: "NO",
    entryPrice: 0.26,
    impliedPrice: 1,
    exitBy: "2026-10-12",
    thesis: [
      "The market priced Gemini jumping from 4th–5th to #1 in six days. Claude held the top four ranks at 1506+ Elo with Gemini 10–15 points back, and at ~800–1,000 votes/day a new model would still be preliminary by Oct 12.",
      "Gemini 4 Argon was corporate-access only and regulatory pressure favored measured releases. Plan: sell near 50–60¢ as the market cools, or hold to resolution (~285%).",
    ],
    status: "closed",
  },
  {
    ...base,
    id: "p5-politics-trump-approval",
    roundNumber: 5,
    sector: "politics",
    analyst: "Shaurya Saxena",
    marketTitle: "Trump's Approval Rating on October 9 (RCP)",
    outcomeLabel: "38.2–38.4%",
    venue: "kalshi",
    market: { source: "kalshi", ticker: "KXAPRPOTUS-26OCT09-38.3" },
    side: "YES",
    entryPrice: 0.3,
    impliedPrice: 1,
    exitBy: "2026-10-09",
    thesis: [
      "RCP had approval at ~38.5%, just above the range, so only a 0.1–0.3pp drift down was needed. Lower readings from NYT and Silver Bulletin added downward pressure, and the average had slid ~1pp since Sept 22.",
      "With three days to close and no major catalyst before the Oct 14 CPI, the range looked underpriced at 30%. Plan: hold to resolution (~233%).",
    ],
    status: "closed",
  },

  // ── Round 6 ────────────────────────────────────────────────────────────
  {
    ...base,
    id: "p6-ai-btc-82k",
    roundNumber: 6,
    sector: "ai_tech",
    analyst: "Nick Sakys",
    marketTitle: "Bitcoin Above ___ on October 16 (12PM ET)",
    outcomeLabel: "$82,000",
    venue: "polymarket",
    market: { source: "polymarket", slug: "bitcoin-above-82000-on-october-16-2026-12pm-et" },
    side: "YES",
    entryPrice: 0.7,
    impliedPrice: 1,
    exitBy: "2026-10-16",
    thesis: [
      "Deribit options priced a close above $82,000 at about 75% versus 70% on a thin prediction market book, a gap between professional market makers and roughly $1,000 of volume.",
      "DVOL near the 10th percentile of its history implied a calm round with BTC 1.5% above the strike, and the Oct 14 CPI print looked more likely to be neutral-to-supportive. Plan: hold to resolution.",
    ],
    status: "closed",
  },
  {
    ...base,
    id: "p6-econ-gdp-35",
    roundNumber: 6,
    sector: "economics",
    analyst: "Carsen Luna",
    marketTitle: "US Real GDP Growth in Q3 2026",
    outcomeLabel: "Above 3.5%",
    venue: "kalshi",
    market: { source: "kalshi", ticker: "KXGDP-26OCT30-T3.5" },
    side: "YES",
    entryPrice: 0.36,
    impliedPrice: 0.52,
    sellLimit: 0.52,
    stopLoss: 0.25,
    exitBy: "2026-10-27",
    thesis: [
      "The market priced >3.5% at 36%, much closer to the NY Fed nowcast (2.65%) than to Atlanta Fed GDPNow (3.6%). GDPNow is built bottom-up from hard data the way BEA computes GDP and has the better real-time track record (RMSE ~1.17pp vs ~1.6pp), implying roughly a 52% chance.",
      "Four scheduled releases before the Oct 27 exit give the market reasons to reprice toward GDPNow. Sell limit at 52% (~44% return); stop at 25% (~31% loss) if weak data pulls GDPNow below 3%.",
    ],
    status: "open",
  },
  {
    ...base,
    id: "p6-politics-brazil-margin",
    roundNumber: 6,
    sector: "politics",
    analyst: "Audrey Hudspeth",
    marketTitle: "Brazil Presidential Election Second Round: Margin of Victory",
    outcomeLabel: "Flávio Bolsonaro <4%",
    venue: "synthesis",
    market: {
      source: "polymarket",
      slug: "will-flavio-bolsonaro-win-the-second-round-of-the-2026-brazilian-presidential-election-by-less-than-4",
    },
    side: "YES",
    entryPrice: 0.35,
    impliedPrice: 1,
    sellLimit: 0.5,
    sellLimitBefore: "2026-10-25",
    exitBy: null,
    thesis: [
      "All three Oct 13 polls showed Flávio up 4 points or less (average +3.2), and he won the first round by just 1.87 points, yet the market favored a 4–8 point win.",
      "The Oct 18 and 23 debates add pressure: Lula is a veteran debater while Flávio has a thin record. Plan: limit sell at 50¢ before Oct 25 (~43% return).",
    ],
    status: "open",
  },

  // ── Round 7 ────────────────────────────────────────────────────────────
  {
    ...base,
    id: "p7-ai-anthropic",
    roundNumber: 7,
    sector: "ai_tech",
    analyst: "Charlie Sneed",
    marketTitle: "Which Company Has the Best AI Model at the End of October?",
    outcomeLabel: "Anthropic",
    venue: "polymarket",
    market: { source: "polymarket", slug: "will-anthropic-have-the-best-ai-model-at-the-end-of-october-2026-20260811194841118" },
    side: "NO",
    entryPrice: 0.82,
    impliedPrice: 1,
    stopLoss: 0.65,
    exitBy: "2026-10-31",
    thesis: [
      "The market resolves on Arena's Text leaderboard, where Gemini 4 Argon has led since Oct 2 and Claude Opus 5.5 sits 16 points back despite twice the votes. Anthropic would need a new model that beats Argon within eleven days, and nothing is announced or leaked.",
      "Main risk is Argon's score sliding as new public votes land. Plan: hold to Oct 31 (~22%); exit at a 65¢ stop (~21% loss) if Argon's lead drops under ten points.",
    ],
    status: "open",
  },
  {
    ...base,
    id: "p7-econ-gdp-30",
    roundNumber: 7,
    sector: "economics",
    analyst: "Matthew Stone",
    marketTitle: "US Real GDP Growth in Q3 2026",
    outcomeLabel: "Above 3.0%",
    venue: "kalshi",
    market: { source: "kalshi", ticker: "KXGDP-26OCT30-T3.0" },
    side: "YES",
    entryPrice: 0.7,
    impliedPrice: 1,
    sellLimit: 0.8,
    stopLoss: 0.55,
    exitBy: "2026-10-29",
    thesis: [
      "GDPNow tracks Q3 at 3.5%, and its ~1.17pp historical error implies roughly a 67% chance of clearing 3.0%. Goldman is at 3.1% and September industrial production rose 0.7%; the big net-exports drag is already in both estimates.",
      "Inventories supply about half the growth and are volatile, so the Oct 28 inventory/trade report is the key risk. Plan: sell near 80¢ (~14%), stop at 55¢ (~21% loss).",
    ],
    status: "open",
  },
  {
    ...base,
    id: "p7-politics-texas-split",
    roundNumber: 7,
    sector: "politics",
    analyst: "Shaurya Saxena",
    marketTitle: "Texas Senate and Governor Combo",
    outcomeLabel: "Reps win Gov, Dems win Senate",
    venue: "polymarket",
    market: {
      source: "polymarket",
      slug: "will-republicans-win-the-texas-governor-election-and-democrats-win-the-texas-senate-election-20260804162614416",
    },
    side: "YES",
    entryPrice: 0.46,
    impliedPrice: 1,
    exitBy: "2026-11-03",
    thesis: [
      "Talarico has led Paxton in nearly every recent poll (NYT 51–45, even Trafalgar has him ahead) with strong independent support and competitive spending.",
      "Abbott edges Hinojosa on border security, public safety, and property taxes, outspent him 6-to-1, and leads among older, high-turnout voters. Plan: hold to Election Day (~117%).",
    ],
    status: "open",
  },
];

export const SEED_TRADES: Trade[] = [];
