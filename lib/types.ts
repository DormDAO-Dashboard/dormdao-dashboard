export interface Holding {
  ticker: string;
  blockchain: string;
  tokens: number;
  entryFdv: string;
  costBasisEth: number;
  pctOfPortfolio: number;
  investmentDate: string;
  gainUsd?: number;
  roiUsdPct?: number;
  roiEthPct?: number;
}

export interface SchoolRow {
  rank: number;
  name: string;
  slug: string;
  nav: number;
  usdReturn: number;
  ethReturn: number;
  avgEntryFdv: number;
  pctDeployed: number;
  holdings?: Holding[];
}

export interface TokenHolding {
  ticker: string;
  school: string;
  schoolSlug: string;
  allocationPct?: number;
}

export interface TokenPrice {
  id: string;
  ticker: string;
  usd: number;
  usd_24h_change: number;
}

export interface ExitedHolding {
  ticker: string;
  gainUsd: number;
  roiUsdPct: number;
  roiEthPct: number;
}

export type Sentiment = "bullish" | "bearish" | "neutral";

export interface ResearchNote {
  id: string;
  created_at: string;
  author_name: string;
  school: string | null;
  token_ticker: string | null;
  sentiment: Sentiment;
  content: string;
  upvotes: number;
  user_id: string | null;
  thesis_type: string | null;
  price_target: number | null;
  time_horizon: string | null;
  url: string | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  school: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface DaoStats {
  totalNAV: number;
  avgUsdReturn: number;
  avgEthReturn: number;
  schoolCount: number;
  topSchool: string;
  avgDeployed: number;
}
