"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SchoolRow } from "@/lib/types";
import { SchoolLogo } from "@/components/SchoolLogo";
import { formatUSD } from "@/lib/utils";
import { buildBuysList, BuyEntry, parseDateMs } from "@/components/RecentBuysFeed";
import { Search } from "lucide-react";

type SortKey = "recent" | "largest" | "bestPnl" | "worstPnl";

function daysAgo(dateMs: number): string {
  const days = Math.floor((Date.now() - dateMs) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function ActivityClient({ schools }: { schools: SchoolRow[] }) {
  const allBuys = useMemo(() => buildBuysList(schools), [schools]);

  const [prices, setPrices] = useState<Record<string, { usd: number }>>({});
  const [ethPrice, setEthPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  const [schoolFilter, setSchoolFilter] = useState("");
  const [tickerFilter, setTickerFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (allBuys.length === 0) { setLoading(false); return; }
    const tickers = [...new Set(allBuys.map(b => b.ticker).concat("ETH"))].join(",");
    fetch(`/api/prices?tickers=${encodeURIComponent(tickers)}`)
      .then(r => r.json())
      .then(d => {
        setPrices(d.prices ?? {});
        setEthPrice(d.prices?.ETH?.usd ?? 0);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const uniqueSchools = useMemo(() => [...new Set(allBuys.map(b => b.school))].sort(), [allBuys]);
  const uniqueTickers = useMemo(() => [...new Set(allBuys.map(b => b.ticker))].sort(), [allBuys]);

  const fromMs = dateFrom ? parseDateMs(dateFrom.replace(/-/g, "/")) : 0;
  const toMs = dateTo ? parseDateMs(dateTo.replace(/-/g, "/")) + 86_400_000 : Infinity;

  function getPnl(buy: BuyEntry): { pnl: number | null; pnlPct: number | null } {
    const price = prices[buy.ticker];
    const currentValue = price && buy.tokens > 0 ? price.usd * buy.tokens : null;
    const costUsd = ethPrice > 0 && buy.costBasisEth > 0 ? buy.costBasisEth * ethPrice : null;

    if (buy.gainUsd !== undefined) {
      return { pnl: buy.gainUsd, pnlPct: buy.roiUsdPct ?? null };
    }
    if (currentValue !== null && costUsd !== null) {
      const pnl = currentValue - costUsd;
      const pnlPct = costUsd > 0 ? (pnl / costUsd) * 100 : null;
      return { pnl, pnlPct };
    }
    return { pnl: null, pnlPct: null };
  }

  const filtered = useMemo(() => {
    let result = allBuys.filter(b => {
      if (schoolFilter && b.school !== schoolFilter) return false;
      if (tickerFilter && b.ticker !== tickerFilter) return false;
      if (fromMs > 0 && b.dateMs < fromMs) return false;
      if (toMs < Infinity && b.dateMs > toMs) return false;
      return true;
    });

    if (sortBy === "recent") {
      result = result.sort((a, b) => b.dateMs - a.dateMs);
    } else if (sortBy === "largest") {
      result = result.sort((a, b) => b.costBasisEth - a.costBasisEth);
    } else if (!loading && (sortBy === "bestPnl" || sortBy === "worstPnl")) {
      result = result.slice().sort((a, b) => {
        const pa = getPnl(a).pnl ?? 0;
        const pb = getPnl(b).pnl ?? 0;
        return sortBy === "bestPnl" ? pb - pa : pa - pb;
      });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBuys, schoolFilter, tickerFilter, sortBy, fromMs, toMs, loading, prices, ethPrice]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={schoolFilter}
          onChange={e => setSchoolFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
        >
          <option value="">All Schools</option>
          {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={tickerFilter}
          onChange={e => setTickerFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
        >
          <option value="">All Tokens</option>
          {uniqueTickers.map(t => <option key={t} value={t}>${t}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 ml-auto"
        >
          <option value="recent">Sort: Most Recent</option>
          <option value="largest">Sort: Largest Position</option>
          <option value="bestPnl">Sort: Best P&L</option>
          <option value="worstPnl">Sort: Worst P&L</option>
        </select>
      </div>

      <div className="text-xs text-gray-500 mb-3">{filtered.length} positions</div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500">
                <th className="text-left px-5 py-3">School</th>
                <th className="text-left px-5 py-3">Token</th>
                <th className="text-left px-5 py-3">Chain</th>
                <th className="text-right px-5 py-3">Date</th>
                <th className="text-right px-5 py-3">Cost (ETH)</th>
                <th className="text-right px-5 py-3">Current Value</th>
                <th className="text-right px-5 py-3">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((buy, i) => {
                const price = prices[buy.ticker];
                const currentValue = price && buy.tokens > 0 ? price.usd * buy.tokens : null;
                const { pnl, pnlPct } = getPnl(buy);

                return (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/schools/${buy.schoolSlug}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                        <SchoolLogo name={buy.school} size={20} />
                        <span className="text-gray-300 text-xs">{buy.school}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/tokens/${buy.ticker.toLowerCase()}`} className="font-mono font-semibold text-white hover:text-primary transition-colors">
                        ${buy.ticker}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{buy.blockchain || "—"}</td>
                    <td className="px-5 py-3 text-right text-gray-400 text-xs">
                      <div>{buy.dateStr}</div>
                      <div className="text-gray-600">{daysAgo(buy.dateMs)}</div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300 text-xs">
                      {buy.costBasisEth > 0 ? `${buy.costBasisEth} ETH` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300 text-xs">
                      {loading ? "…" : currentValue !== null ? formatUSD(currentValue) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {loading ? (
                        <span className="text-gray-600">…</span>
                      ) : pnl !== null ? (
                        <span className={pnl >= 0 ? "text-primary" : "text-danger"}>
                          {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                          {pnlPct !== null && (
                            <span className="opacity-70 ml-1">({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No purchases match the selected filters.</div>
        )}
      </div>
    </>
  );
}
