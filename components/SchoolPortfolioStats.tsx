"use client";
import { useEffect, useState } from "react";
import { Holding } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { formatUSD } from "@/lib/utils";
import { parseDateMs } from "@/components/RecentBuysFeed";

interface RecentTrade {
  detected_at: string;
  change_type: string;
  token_ticker: string;
  token_name: string | null;
}

interface Props {
  holdings: Holding[];
  schoolName: string;
  nav: number;
  rank: number;
}

const SEASON_START_MS = new Date("2025-07-01").getTime();

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function TradeTypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  const cls =
    t === "buy"      ? "bg-primary/20 text-primary" :
    t === "exit"     ? "bg-danger/20 text-danger" :
    t === "trim"     ? "bg-yellow-900/40 text-yellow-400" :
    t === "increase" ? "bg-primary/20 text-primary" :
    t === "decrease" ? "bg-yellow-900/40 text-yellow-400" :
    t === "sell"     ? "bg-danger/20 text-danger" :
                       "bg-gray-800 text-gray-400";
  const label =
    t === "increase" ? "add" :
    t === "decrease" ? "trim" :
    t === "sell"     ? "exit" :
    t;
  return (
    <span className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded uppercase ${cls}`}>
      {label}
    </span>
  );
}

export function SchoolPortfolioStats({ holdings, schoolName, nav, rank }: Props) {
  const [recentTrade, setRecentTrade] = useState<RecentTrade | null>(null);
  const [tradeLoading, setTradeLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("portfolio_changes")
      .select("detected_at, change_type, token_ticker, token_name")
      .eq("school_name", schoolName)
      .order("detected_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setRecentTrade(data?.[0] ?? null);
        setTradeLoading(false);
      });
  }, [schoolName]);

  // Avg position age — current season only (pre-season carry-overs excluded)
  const now = Date.now();
  const seasonAges = holdings
    .map((h) => {
      if (!h.investmentDate) return null;
      const ms = parseDateMs(h.investmentDate);
      if (ms <= 0 || ms < SEASON_START_MS) return null;
      const age = (now - ms) / (1000 * 60 * 60 * 24);
      return age >= 0 ? age : null;
    })
    .filter((a): a is number => a !== null);
  const avgAgeDays = seasonAges.length > 0
    ? seasonAges.reduce((s, a) => s + a, 0) / seasonAges.length
    : null;

  // Fallback for Most Recent Position when portfolio_changes is empty
  const mostRecentHolding = holdings
    .filter((h) => h.investmentDate)
    .reduce<Holding | null>((best, h) => {
      if (!best) return h;
      return parseDateMs(h.investmentDate) > parseDateMs(best.investmentDate) ? h : best;
    }, null);

  // Largest / smallest by % of portfolio
  const withPct = [...holdings]
    .filter((h) => h.pctOfPortfolio > 0)
    .sort((a, b) => b.pctOfPortfolio - a.pctOfPortfolio);
  const largestPos  = withPct[0] ?? null;
  const smallestPos = withPct.length > 1 ? withPct.at(-1)! : null;

  // Avg position size
  const avgPositionSizeUsd = holdings.length > 0 && nav > 0
    ? withPct.reduce((s, h) => s + (nav * h.pctOfPortfolio / 100), 0) / holdings.length
    : null;

  // Win/Loss vs ETH: roiEthPct > 0 = token outperformed ETH = winning; exclude ETH itself
  const holdingsWithEthRoi = holdings.filter((h) => h.ticker !== "ETH" && h.roiEthPct !== undefined);
  const winningCount = holdingsWithEthRoi.filter((h) => (h.roiEthPct ?? 0) > 0).length;
  const losingCount  = holdingsWithEthRoi.filter((h) => (h.roiEthPct ?? 0) < 0).length;
  const winRate = holdingsWithEthRoi.length > 0
    ? Math.round((winningCount / holdingsWithEthRoi.length) * 100)
    : null;

  // Best / worst by gainUsd from sheet
  const holdingsWithGain = holdings.filter((h): h is Holding & { gainUsd: number } =>
    h.gainUsd !== undefined
  );
  const bestPos  = holdingsWithGain.length > 0
    ? holdingsWithGain.reduce((b, h) => h.gainUsd > b.gainUsd ? h : b)
    : null;
  const worstPos = holdingsWithGain.length > 0
    ? holdingsWithGain.reduce((w, h) => h.gainUsd < w.gainUsd ? h : w)
    : null;

  const lbl = "text-xs text-gray-400 mb-1";
  const val = "font-mono font-semibold text-sm text-white";

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio Insights</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">

        {/* Overview */}
        <div>
          <div className={lbl}>Positions</div>
          <div className={val}>{holdings.length}</div>
          <div className="text-xs text-gray-600 mt-0.5">active holdings</div>
        </div>

        <div>
          <div className={lbl}>Rank</div>
          <div className={`${val} text-primary`}>#{rank}</div>
          <div className="text-xs text-gray-600 mt-0.5">by ETH performance</div>
        </div>

        <div>
          <div className={lbl}>Avg Position Age</div>
          <div className={val}>
            {avgAgeDays !== null ? `${Math.round(avgAgeDays)}d` : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {avgAgeDays !== null ? `~${(avgAgeDays / 30).toFixed(1)} months` : "current season only"}
          </div>
        </div>

        {/* Position sizing */}
        <div>
          <div className={lbl}>Largest Position</div>
          <div className={val}>{largestPos ? `$${largestPos.ticker}` : "—"}</div>
          {largestPos && (
            <div className="text-xs text-gray-600 mt-0.5">{largestPos.pctOfPortfolio.toFixed(1)}% of NAV</div>
          )}
        </div>

        <div>
          <div className={lbl}>Smallest Position</div>
          <div className={val}>{smallestPos ? `$${smallestPos.ticker}` : "—"}</div>
          {smallestPos && (
            <div className="text-xs text-gray-600 mt-0.5">{smallestPos.pctOfPortfolio.toFixed(1)}% of NAV</div>
          )}
        </div>

        <div>
          <div className={lbl}>Avg Position Size</div>
          <div className={val}>
            {avgPositionSizeUsd !== null && avgPositionSizeUsd > 0
              ? formatUSD(avgPositionSizeUsd)
              : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">avg USD per holding</div>
        </div>

        {/* Win/Loss vs ETH */}
        <div>
          <div className={lbl}>Win Rate vs ETH</div>
          <div className={`${val} ${winRate === null ? "" : winRate >= 50 ? "text-primary" : "text-danger"}`}>
            {winRate !== null ? `${winRate}%` : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {holdingsWithEthRoi.length > 0
              ? `${winningCount}/${holdingsWithEthRoi.length} beat ETH`
              : "no ETH ROI data"}
          </div>
        </div>

        <div>
          <div className={lbl}>Beating ETH</div>
          <div className={`${val} ${winningCount > 0 ? "text-primary" : ""}`}>
            {holdingsWithEthRoi.length > 0 ? winningCount : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">outperforming ETH</div>
        </div>

        <div>
          <div className={lbl}>Lagging ETH</div>
          <div className={`${val} ${losingCount > 0 ? "text-danger" : ""}`}>
            {holdingsWithEthRoi.length > 0 ? losingCount : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">underperforming ETH</div>
        </div>

        {/* Best / worst (only when sheet has gainUsd) */}
        {bestPos && (
          <div>
            <div className={lbl}>Best Position</div>
            <div className={val}>${bestPos.ticker}</div>
            <div className="text-xs text-primary mt-0.5">
              +{formatUSD(bestPos.gainUsd)}
              {bestPos.roiUsdPct !== undefined && ` (+${bestPos.roiUsdPct.toFixed(0)}%)`}
            </div>
          </div>
        )}

        {worstPos && worstPos.gainUsd < 0 && (
          <div>
            <div className={lbl}>Worst Position</div>
            <div className={val}>${worstPos.ticker}</div>
            <div className="text-xs text-danger mt-0.5">
              {formatUSD(worstPos.gainUsd)}
              {worstPos.roiUsdPct !== undefined && ` (${worstPos.roiUsdPct.toFixed(0)}%)`}
            </div>
          </div>
        )}

        {/* Most recent position — full width */}
        <div className="col-span-2 md:col-span-3 border-t border-gray-800/60 pt-4">
          <div className={lbl}>Most Recent Position</div>
          {tradeLoading ? (
            <div className="text-sm text-gray-600 mt-1">Loading…</div>
          ) : recentTrade ? (
            <div className="flex items-center gap-2 mt-1">
              <TradeTypeBadge type={recentTrade.change_type} />
              <span className="font-mono text-sm text-white">${recentTrade.token_ticker}</span>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-500">{daysAgo(recentTrade.detected_at)}</span>
            </div>
          ) : mostRecentHolding ? (
            <div className="flex items-center gap-2 mt-1">
              <TradeTypeBadge type="buy" />
              <span className="font-mono text-sm text-white">${mostRecentHolding.ticker}</span>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-500">
                {mostRecentHolding.investmentDate.replace(/\//g, "-")}
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-600 mt-1">No data available</div>
          )}
        </div>

      </div>
    </div>
  );
}
