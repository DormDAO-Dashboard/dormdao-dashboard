"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SchoolRow } from "@/lib/types";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { formatUSD } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export interface BuyEntry {
  school: string;
  schoolSlug: string;
  ticker: string;
  blockchain: string;
  dateStr: string;
  dateMs: number;
  costBasisEth: number;
  tokens: number;
  gainUsd?: number;
  roiUsdPct?: number;
  roiEthPct?: number;
}

export function parseDateMs(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return 0;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d).getTime();
}

export function buildBuysList(schools: SchoolRow[]): BuyEntry[] {
  const buys: BuyEntry[] = [];
  for (const school of schools) {
    for (const h of school.holdings ?? []) {
      if (!h.investmentDate) continue;
      const dateMs = parseDateMs(h.investmentDate);
      if (dateMs <= 0) continue;
      buys.push({
        school: school.name,
        schoolSlug: school.slug,
        ticker: h.ticker,
        blockchain: h.blockchain,
        dateStr: h.investmentDate,
        dateMs,
        costBasisEth: h.costBasisEth,
        tokens: h.tokens,
        gainUsd: h.gainUsd,
        roiUsdPct: h.roiUsdPct,
        roiEthPct: h.roiEthPct,
      });
    }
  }
  buys.sort((a, b) => b.dateMs - a.dateMs);
  return buys;
}

function daysAgo(dateMs: number): string {
  const days = Math.floor((Date.now() - dateMs) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function RecentBuysFeed({ schools }: { schools: SchoolRow[] }) {
  const [prices, setPrices] = useState<Record<string, { usd: number }>>({});
  const [ethPrice, setEthPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  const recent = buildBuysList(schools).slice(0, 10);

  useEffect(() => {
    if (recent.length === 0) { setLoading(false); return; }
    const tickers = [...new Set(recent.map(b => b.ticker).concat("ETH"))].join(",");
    fetch(`/api/prices?tickers=${encodeURIComponent(tickers)}`)
      .then(r => r.json())
      .then(d => {
        setPrices(d.prices ?? {});
        setEthPrice(d.prices?.ETH?.usd ?? 0);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (recent.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">Recent Buys</h2>
        <Link href="/activity" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-gray-800/50">
        {recent.map((buy, i) => {
          const price = prices[buy.ticker];
          const currentValue = price && buy.tokens > 0 ? price.usd * buy.tokens : null;
          const costUsd = ethPrice > 0 && buy.costBasisEth > 0 ? buy.costBasisEth * ethPrice : null;

          let pnl: number | null = null;
          let pnlPct: number | null = null;
          if (buy.gainUsd !== undefined) {
            pnl = buy.gainUsd;
            pnlPct = buy.roiUsdPct ?? null;
          } else if (currentValue !== null && costUsd !== null) {
            pnl = currentValue - costUsd;
            pnlPct = costUsd > 0 ? (pnl / costUsd) * 100 : null;
          }

          return (
            <div key={`${buy.schoolSlug}-${buy.ticker}-${buy.dateStr}-${i}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/30 transition-colors">
              <Link href={`/schools/${buy.schoolSlug}`} className="shrink-0">
                <SchoolLogo name={buy.school} size={28} />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link href={`/tokens/${buy.ticker.toLowerCase()}`} className="font-mono font-semibold text-gray-900 dark:text-white hover:text-primary text-sm transition-colors">
                    ${buy.ticker}
                  </Link>
                  {buy.blockchain && <span className="text-xs text-gray-500">{buy.blockchain}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  <Link href={`/schools/${buy.schoolSlug}`} className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">{schoolDisplayName(buy.school)}</Link>
                  {" · "}{daysAgo(buy.dateMs)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-gray-300 text-xs">{buy.costBasisEth > 0 ? `${buy.costBasisEth} ETH` : "—"}</div>
                {!loading && currentValue !== null && (
                  <div className="text-gray-500 text-xs">{formatUSD(currentValue, true)}</div>
                )}
              </div>
              <div className="text-right shrink-0 min-w-[64px]">
                {loading ? (
                  <span className="text-gray-600 text-xs">…</span>
                ) : pnl !== null ? (
                  <>
                    <div className={`font-mono font-semibold text-xs ${pnl >= 0 ? "text-primary" : "text-danger"}`}>
                      {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                    </div>
                    {pnlPct !== null && (
                      <div className={`text-xs opacity-70 ${pnlPct >= 0 ? "text-primary" : "text-danger"}`}>
                        ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-gray-600 text-xs">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
