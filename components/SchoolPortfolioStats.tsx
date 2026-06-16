"use client";
import { useEffect, useState } from "react";
import { Holding } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { formatUSD } from "@/lib/utils";

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
}

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function TradeTypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  const cls =
    t === "buy"  ? "bg-primary/20 text-primary" :
    t === "exit" ? "bg-danger/20 text-danger" :
    t === "trim" ? "bg-yellow-900/40 text-yellow-400" :
                   "bg-gray-800 text-gray-400";
  return (
    <span className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded uppercase ${cls}`}>
      {type}
    </span>
  );
}

export function SchoolPortfolioStats({ holdings, schoolName, nav }: Props) {
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

  const withPct = holdings.filter(h => h.pctOfPortfolio > 0);
  const sortedByPct = [...withPct].sort((a, b) => b.pctOfPortfolio - a.pctOfPortfolio);
  const largestPos = sortedByPct[0] ?? null;
  const smallestPos = sortedByPct.at(-1) ?? null;

  const holdingsWithPnl = holdings.filter(h => h.gainUsd !== undefined);
  const winningCount = holdingsWithPnl.filter(h => (h.gainUsd ?? 0) > 0).length;
  const losingCount  = holdingsWithPnl.filter(h => (h.gainUsd ?? 0) < 0).length;
  const winRate = holdingsWithPnl.length > 0
    ? Math.round((winningCount / holdingsWithPnl.length) * 100)
    : null;

  const avgPositionSizeUsd = holdings.length > 0
    ? withPct.reduce((s, h) => s + (nav * h.pctOfPortfolio / 100), 0) / holdings.length
    : null;

  const lbl = "text-xs text-gray-400 mb-1";
  const val = "font-mono font-semibold text-sm text-white";

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio Insights</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">

        <div>
          <div className={lbl}>Largest Position</div>
          <div className={val}>{largestPos ? `$${largestPos.ticker}` : "—"}</div>
          {largestPos && (
            <div className="text-xs text-gray-600 mt-0.5">{largestPos.pctOfPortfolio.toFixed(1)}% of NAV</div>
          )}
        </div>

        <div>
          <div className={lbl}>Smallest Position</div>
          <div className={val}>{smallestPos && smallestPos !== largestPos ? `$${smallestPos.ticker}` : "—"}</div>
          {smallestPos && smallestPos !== largestPos && (
            <div className="text-xs text-gray-600 mt-0.5">{smallestPos.pctOfPortfolio.toFixed(1)}% of NAV</div>
          )}
        </div>

        <div>
          <div className={lbl}>Win Rate</div>
          <div className={`${val} ${winRate === null ? "" : winRate >= 50 ? "text-primary" : "text-danger"}`}>
            {winRate !== null ? `${winRate}%` : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {holdingsWithPnl.length > 0
              ? `${winningCount}/${holdingsWithPnl.length} positions`
              : "no P&L data"}
          </div>
        </div>

        <div>
          <div className={lbl}>Winning Positions</div>
          <div className={`${val} ${holdingsWithPnl.length > 0 && winningCount > 0 ? "text-primary" : ""}`}>
            {holdingsWithPnl.length > 0 ? winningCount : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">currently in profit</div>
        </div>

        <div>
          <div className={lbl}>Losing Positions</div>
          <div className={`${val} ${holdingsWithPnl.length > 0 && losingCount > 0 ? "text-danger" : ""}`}>
            {holdingsWithPnl.length > 0 ? losingCount : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">currently at a loss</div>
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

        <div className="col-span-2 md:col-span-3 border-t border-gray-800/60 pt-4">
          <div className={lbl}>Most Recent Trade</div>
          {tradeLoading ? (
            <div className="text-sm text-gray-600 mt-1">Loading…</div>
          ) : recentTrade ? (
            <div className="flex items-center gap-2 mt-1">
              <TradeTypeBadge type={recentTrade.change_type} />
              <span className="font-mono text-sm text-white">${recentTrade.token_ticker}</span>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-500">{daysAgo(recentTrade.detected_at)}</span>
            </div>
          ) : (
            <div className="text-sm text-gray-600 mt-1">No trades recorded</div>
          )}
        </div>

      </div>
    </div>
  );
}
