"use client";
import { useEffect, useState } from "react";
import { KpiCard } from "@/components/ui/Card";
import { NavBarChart } from "@/components/charts/NavBarChart";
import { EthReturnChart } from "@/components/charts/EthReturnChart";
import { TopBottomChart } from "@/components/charts/TopBottomChart";
import { DeploymentScatter } from "@/components/charts/ScatterChart";
import { SortableLeaderboard } from "@/components/SortableLeaderboard";
import { RecentBuysFeed } from "@/components/RecentBuysFeed";
import { EthHoldingsTable } from "@/components/EthHoldingsTable";
import { SchoolRow } from "@/lib/types";
import { ADMIN_SECRET } from "@/lib/admin";
import { formatNav, formatUSD, formatPct } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Camera, TrendingUp, TrendingDown } from "lucide-react";

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [snapResult, setSnapResult] = useState<string | null>(null);

  useEffect(() => {
    setIsAdmin(new URLSearchParams(window.location.search).has("admin"));
  }, []);

  if (!isAdmin) return null;

  async function captureSnapshot() {
    setSnapping(true);
    setSnapResult(null);
    try {
      const res = await fetch("/api/snapshot", {
        method: "POST",
        headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
      });
      const data = await res.json();
      if (data.error) {
        setSnapResult(`Error: ${data.error}`);
      } else {
        setSnapResult(`Snapshot saved — ${data.snapshotCount} schools, ${data.changesDetected} changes detected`);
      }
    } catch {
      setSnapResult("Network error");
    } finally {
      setSnapping(false);
    }
  }

  return (
    <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border border-yellow-300 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/10">
      <Camera className="w-4 h-4 text-yellow-500 shrink-0" />
      <span className="text-xs text-yellow-700 dark:text-yellow-400">Admin</span>
      <button
        onClick={captureSnapshot}
        disabled={snapping}
        className="px-3 py-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-600/20 border border-yellow-300 dark:border-yellow-600/40 text-yellow-700 dark:text-yellow-400 text-xs hover:bg-yellow-600/30 transition-colors disabled:opacity-50"
      >
        {snapping ? "Saving…" : "Capture Snapshot"}
      </button>
      {snapResult && <span className="text-xs text-yellow-700 dark:text-yellow-300">{snapResult}</span>}
    </div>
  );
}

function DaoWideMetrics({ schools }: { schools: SchoolRow[] }) {
  const allHoldings = schools.flatMap(s =>
    (s.holdings ?? []).map(h => ({ ...h, schoolName: s.name }))
  );

  // Total active positions across all schools
  const totalPositions = allHoldings.length;

  // Distinct tickers
  const uniqueTokenCount = new Set(allHoldings.map(h => h.ticker)).size;

  // Most widely held: count distinct schools per ticker
  const tokenSchoolsMap: Record<string, Set<string>> = {};
  for (const s of schools) {
    for (const h of s.holdings ?? []) {
      if (!tokenSchoolsMap[h.ticker]) tokenSchoolsMap[h.ticker] = new Set();
      tokenSchoolsMap[h.ticker].add(s.name);
    }
  }
  const [mostWidelyHeldTicker, mostWidelyHeldCount] = Object.entries(tokenSchoolsMap)
    .reduce<[string, number]>(
      (best, [ticker, schoolSet]) => schoolSet.size > best[1] ? [ticker, schoolSet.size] : best,
      ["—", 0]
    );

  // Best / Worst position by gainUsd (sheet-provided P&L only)
  const holdingsWithGain = allHoldings.filter(
    (h): h is typeof h & { gainUsd: number } => h.gainUsd !== undefined
  );
  const bestPos = holdingsWithGain.length > 0
    ? holdingsWithGain.reduce((b, h) => h.gainUsd > b.gainUsd ? h : b)
    : null;
  const worstPos = holdingsWithGain.length > 0
    ? holdingsWithGain.reduce((w, h) => h.gainUsd < w.gainUsd ? h : w)
    : null;

  // Position-level win rate (distinct from school-level win rate)
  const posWinRate = holdingsWithGain.length > 0
    ? Math.round((holdingsWithGain.filter(h => h.gainUsd > 0).length / holdingsWithGain.length) * 100)
    : null;
  const posWinCount = holdingsWithGain.filter(h => h.gainUsd > 0).length;

  const statCard = "rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-4 py-4 flex flex-col gap-1";

  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">DAO-Wide Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">

        <div className={statCard}>
          <span className="text-xs text-gray-500">Most Widely Held</span>
          <span className="text-base font-mono font-bold text-gray-900 dark:text-white">${mostWidelyHeldTicker}</span>
          <span className="text-xs text-gray-600">{mostWidelyHeldCount > 0 ? `${mostWidelyHeldCount} of 17 schools` : "—"}</span>
        </div>

        <div className={statCard}>
          <span className="text-xs text-gray-500">Unique Tokens</span>
          <span className="text-base font-mono font-bold text-gray-900 dark:text-white">{uniqueTokenCount}</span>
          <span className="text-xs text-gray-600">across all portfolios</span>
        </div>

        <div className={statCard}>
          <span className="text-xs text-gray-500">Best Position</span>
          {bestPos ? (
            <>
              <span className="text-base font-mono font-bold text-gray-900 dark:text-white">${bestPos.ticker}</span>
              <span className="text-xs font-mono text-primary">+{formatUSD(bestPos.gainUsd)}</span>
            </>
          ) : (
            <span className="text-base font-mono font-bold text-gray-600">—</span>
          )}
        </div>

        <div className={statCard}>
          <span className="text-xs text-gray-500">Worst Position</span>
          {worstPos && worstPos.gainUsd < 0 ? (
            <>
              <span className="text-base font-mono font-bold text-gray-900 dark:text-white">${worstPos.ticker}</span>
              <span className="text-xs font-mono text-danger">{formatUSD(worstPos.gainUsd)}</span>
            </>
          ) : (
            <span className="text-base font-mono font-bold text-gray-600">—</span>
          )}
        </div>

        <div className={statCard}>
          <span className="text-xs text-gray-500">Position Win Rate</span>
          {posWinRate !== null ? (
            <>
              <span className="flex items-center gap-1 text-base font-mono font-bold text-gray-900 dark:text-white">
                <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                {posWinRate}%
              </span>
              <span className="text-xs text-gray-600">{posWinCount}/{holdingsWithGain.length} positions</span>
            </>
          ) : (
            <span className="text-base font-mono font-bold text-gray-600">—</span>
          )}
        </div>

        <div className={statCard}>
          <span className="text-xs text-gray-500">Total Positions</span>
          <span className="text-base font-mono font-bold text-gray-900 dark:text-white">{totalPositions}</span>
          <span className="text-xs text-gray-600">active holdings</span>
        </div>

      </div>
    </div>
  );
}

type Period = "2526" | "inception" | "2425" | "2324";

const PERIODS: { key: Period; label: string }[] = [
  { key: "2526",      label: "2025–2026" },
  { key: "2425",      label: "2024–2025" },
  { key: "2324",      label: "2023–2024" },
  { key: "inception", label: "Since Inception" },
];

export function DashboardClient({
  schools,
  sinceInceptionSchools,
  schools2425,
  schools2324,
  fetchedAt,
}: {
  schools: SchoolRow[];
  sinceInceptionSchools: SchoolRow[];
  schools2425: SchoolRow[];
  schools2324: SchoolRow[];
  fetchedAt: string;
}) {
  const [period, setPeriod] = useState<Period>("2526");

  const activeSchools =
    period === "2526"      ? schools :
    period === "inception" ? (sinceInceptionSchools.length > 0 ? sinceInceptionSchools : schools) :
    period === "2425"      ? schools2425 :
                             schools2324;

  const totalNAV = activeSchools.reduce((s, x) => s + x.nav, 0);
  const avgUsdReturn = activeSchools.reduce((s, x) => s + x.usdReturn, 0) / (activeSchools.length || 1);
  const avgEthReturn = activeSchools.reduce((s, x) => s + x.ethReturn, 0) / (activeSchools.length || 1);
  const avgDeployed = activeSchools.reduce((s, x) => s + x.pctDeployed, 0) / (activeSchools.length || 1);

  const ethReturns = activeSchools.map((s) => s.ethReturn);
  const winRate = ethReturns.length > 0
    ? Math.round((ethReturns.filter((r) => r > 0).length / ethReturns.length) * 100)
    : 0;
  const sd = stdDev(ethReturns);
  const sharpe = sd > 0 ? (avgEthReturn / sd).toFixed(2) : "—";

  const syncedAgo = Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000);

  return (
    <>
      <AdminPanel />

      {/* Period toggle */}
      <div className="flex overflow-x-auto gap-1.5 mb-4 pb-1 scrollbar-hide">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              period === key
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-transparent border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total Portfolio NAV" value={formatNav(totalNAV)} />
        <KpiCard
          label="Avg USD Return"
          value={formatPct(avgUsdReturn)}
          positive={avgUsdReturn >= 0}
        />
        <KpiCard
          label="Avg ETH Return"
          value={formatPct(avgEthReturn)}
          positive={avgEthReturn >= 0}
        />
        <KpiCard label="Avg Deployment" value={formatPct(avgDeployed)} />
      </div>

      {/* DAO-Wide Metrics — current season only */}
      {period === "2526" && <DaoWideMetrics schools={schools} />}

      {/* Analytics row */}
      <div className="flex overflow-x-auto gap-3 mb-5 scrollbar-hide md:grid md:grid-cols-3">
        <div className="min-w-[120px] shrink-0 md:min-w-0 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-4 py-3 flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Win Rate</span>
          <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">{winRate}%</span>
          <span className="text-xs text-gray-600 mt-0.5">{ethReturns.filter((r) => r > 0).length}/{ethReturns.length} schools positive</span>
        </div>
        <div className="min-w-[120px] shrink-0 md:min-w-0 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-4 py-3 flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Sharpe Ratio</span>
          <span className={`text-lg font-mono font-bold ${typeof sharpe === "string" || parseFloat(sharpe) >= 1 ? "text-primary" : parseFloat(sharpe) >= 0 ? "text-gray-900 dark:text-white" : "text-danger"}`}>{sharpe}</span>
          <span className="text-xs text-gray-600 mt-0.5">ETH return / std dev</span>
        </div>
        <div className="min-w-[120px] shrink-0 md:min-w-0 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-4 py-3 flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Schools</span>
          <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">{activeSchools.length}</span>
          <span className="text-xs text-gray-600 mt-0.5">active portfolios</span>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Portfolio NAV by School (Ranked)</h2>
          <NavBarChart schools={activeSchools} />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">ETH Return — All Schools</h2>
          <EthReturnChart schools={activeSchools} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Top &amp; Bottom 3 — ETH Return</h2>
          <TopBottomChart schools={activeSchools} />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Deployment % vs. NAV</h2>
          <DeploymentScatter schools={activeSchools} />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">
            School Leaderboard — All {activeSchools.length}
          </h2>
          <Link
            href="/schools"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Schools tab <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <SortableLeaderboard schools={activeSchools} />
      </div>

      {/* ETH Holdings + Recent Buys — current year only (require live holdings) */}
      {period === "2526" && (
        <>
          <EthHoldingsTable schools={schools} />
          <RecentBuysFeed schools={schools} />
        </>
      )}

      {/* Sync footer */}
      <div className="text-center text-xs text-gray-600 pb-2">
        Last synced: {syncedAgo < 1 ? "just now" : `${syncedAgo} min ago`}
        {" · "}
        <button
          onClick={async () => {
            await fetch("/api/revalidate", { method: "POST" });
            window.location.reload();
          }}
          className="text-primary hover:underline"
        >
          Refresh
        </button>
      </div>
    </>
  );
}
