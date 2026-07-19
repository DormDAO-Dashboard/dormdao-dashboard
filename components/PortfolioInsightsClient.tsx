"use client";
import { useEffect, useState } from "react";
import { Holding } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { parseDateMs } from "@/components/RecentBuysFeed";

interface Props {
  holdings: Holding[];
  rank: number;
}

export function PortfolioInsightsClient({ holdings, rank }: Props) {
  const [prices, setPrices] = useState<Record<string, { usd: number }>>({});
  const [ethPrice, setEthPrice] = useState(0);
  const [historicalEth, setHistoricalEth] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (holdings.length === 0) { setLoading(false); return; }
    const tickers = [...new Set(holdings.map((h) => h.ticker).concat("ETH"))].join(",");
    fetch(`/api/prices?tickers=${encodeURIComponent(tickers)}`)
      .then((r) => r.json())
      .then((d) => {
        setPrices(d.prices ?? {});
        setEthPrice(d.prices?.ETH?.usd ?? 0);
      })
      .finally(() => setLoading(false));
  }, [holdings]);

  useEffect(() => {
    const datesNeeded = Array.from(new Set(
      holdings
        .filter((h) => h.gainUsd === undefined && h.investmentDate && h.costBasisEth > 0)
        .map((h) => h.investmentDate)
    ));
    if (datesNeeded.length === 0) return;
    fetch(`/api/eth-price-history?dates=${encodeURIComponent(datesNeeded.join(","))}`)
      .then((r) => r.json())
      .then((d) => setHistoricalEth(d.prices ?? {}))
      .catch(() => {});
  }, [holdings]);

  const positions = holdings.length;

  const largestPosition = [...holdings]
    .filter((h) => h.pctOfPortfolio > 0)
    .sort((a, b) => b.pctOfPortfolio - a.pctOfPortfolio)[0] ?? null;

  const now = Date.now();

  // OLD: all active positions regardless of season (inflated by prior-season carry-overs)
  const allAges = holdings
    .map((h) => {
      if (!h.investmentDate) return null;
      const ms = parseDateMs(h.investmentDate);
      if (ms <= 0) return null;
      const age = (now - ms) / (1000 * 60 * 60 * 24);
      return age >= 0 ? age : null;
    })
    .filter((age): age is number => age !== null);
  const oldAvgAge = allAges.length > 0 ? allAges.reduce((s, a) => s + a, 0) / allAges.length : null;

  // NEW: current season only — excludes positions purchased before 2025-07-01
  const SEASON_START_MS = new Date('2025-07-01').getTime();
  const validAges = holdings
    .map((h) => {
      if (!h.investmentDate) return null;
      const ms = parseDateMs(h.investmentDate);
      if (ms <= 0 || ms < SEASON_START_MS) return null;
      const age = (now - ms) / (1000 * 60 * 60 * 24);
      return age >= 0 ? age : null;
    })
    .filter((age): age is number => age !== null);
  const avgAgeDays = validAges.length > 0
    ? validAges.reduce((s, a) => s + a, 0) / validAges.length
    : null;

  // P&L: prefer sheet's Gain(USD), then historical ETH, then current ETH
  const pnlByHolding = !loading
    ? holdings.flatMap((h) => {
        if (h.gainUsd !== undefined) {
          return [{ ticker: h.ticker, pnl: h.gainUsd, pnlPct: h.roiUsdPct ?? null }];
        }
        const p = prices[h.ticker];
        if (!p || !h.tokens || !h.costBasisEth) return [];
        const ethAtPurchase = historicalEth[h.investmentDate] || ethPrice;
        if (ethAtPurchase <= 0) return [];
        const currentValue = h.tokens * p.usd;
        const costUsd = h.costBasisEth * ethAtPurchase;
        const pnl = currentValue - costUsd;
        const pnlPct = costUsd > 0 ? (pnl / costUsd) * 100 : null;
        return [{ ticker: h.ticker, pnl, pnlPct }];
      })
    : [];

  const bestPos = pnlByHolding.length > 0
    ? pnlByHolding.reduce((best, cur) => cur.pnl > best.pnl ? cur : best)
    : null;
  const worstPos = pnlByHolding.length > 0
    ? pnlByHolding.reduce((worst, cur) => cur.pnl < worst.pnl ? cur : worst)
    : null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio Insights</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Positions</div>
          <div className="text-xl font-mono font-bold text-white">{positions}</div>
          <div className="text-xs text-gray-600 mt-0.5">active holdings</div>
        </div>

        {largestPosition ? (
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Largest Position</div>
            <div className="text-lg font-mono font-bold text-white">${largestPosition.ticker}</div>
            <div className="text-xs text-gray-600 mt-0.5">{largestPosition.pctOfPortfolio.toFixed(1)}% of portfolio</div>
          </div>
        ) : <div />}

        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Avg Position Age</div>
          <div className="text-xl font-mono font-bold text-white">
            {avgAgeDays !== null ? `${Math.round(avgAgeDays)}d` : "—"}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {avgAgeDays !== null ? `~${(avgAgeDays / 30).toFixed(1)} months` : "no date data"}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Rank</div>
          <div className="text-xl font-mono font-bold text-primary">#{rank}</div>
          <div className="text-xs text-gray-600 mt-0.5">by ETH performance</div>
        </div>

        {!loading && bestPos && (
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Most Profitable</div>
            <div className="text-sm font-mono font-bold text-white">${bestPos.ticker}</div>
            <div className="text-primary text-xs font-mono mt-0.5">
              +{formatUSD(bestPos.pnl)}
              {bestPos.pnlPct !== null && ` (+${bestPos.pnlPct.toFixed(0)}%)`}
            </div>
          </div>
        )}

        {!loading && worstPos && worstPos.pnl < 0 && (
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Biggest Loss</div>
            <div className="text-sm font-mono font-bold text-white">${worstPos.ticker}</div>
            <div className="text-danger text-xs font-mono mt-0.5">
              {formatUSD(worstPos.pnl)}
              {worstPos.pnlPct !== null && ` (${worstPos.pnlPct.toFixed(0)}%)`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
