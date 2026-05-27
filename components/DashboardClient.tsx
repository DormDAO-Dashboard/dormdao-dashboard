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
import { formatUSD, formatPct } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";

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
    setIsAdmin(window.location.search.includes("admin=true"));
  }, []);

  if (!isAdmin) return null;

  async function captureSnapshot() {
    setSnapping(true);
    setSnapResult(null);
    const secret = new URLSearchParams(window.location.search).get("secret") ?? "";
    try {
      const res = await fetch("/api/snapshot", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
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
    <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border border-yellow-900/50 bg-yellow-900/10">
      <Camera className="w-4 h-4 text-yellow-500 shrink-0" />
      <span className="text-xs text-yellow-400">Admin</span>
      <button
        onClick={captureSnapshot}
        disabled={snapping}
        className="px-3 py-1.5 rounded-lg bg-yellow-600/20 border border-yellow-600/40 text-yellow-400 text-xs hover:bg-yellow-600/30 transition-colors disabled:opacity-50"
      >
        {snapping ? "Saving…" : "Capture Snapshot"}
      </button>
      {snapResult && <span className="text-xs text-yellow-300">{snapResult}</span>}
    </div>
  );
}

export function DashboardClient({
  schools,
  sinceInceptionSchools,
  fetchedAt,
}: {
  schools: SchoolRow[];
  sinceInceptionSchools: SchoolRow[];
  fetchedAt: string;
}) {
  const [period, setPeriod] = useState<"current" | "inception">("current");

  const activeSchools = period === "current" ? schools : sinceInceptionSchools.length > 0 ? sinceInceptionSchools : schools;

  const totalNAV = schools.reduce((s, x) => s + x.nav, 0);
  const avgUsdReturn = activeSchools.reduce((s, x) => s + x.usdReturn, 0) / (activeSchools.length || 1);
  const avgEthReturn = activeSchools.reduce((s, x) => s + x.ethReturn, 0) / (activeSchools.length || 1);
  const avgDeployed = schools.reduce((s, x) => s + x.pctDeployed, 0) / (schools.length || 1);

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
      {sinceInceptionSchools.length > 0 && (
        <div className="flex gap-1.5 mb-6">
          {(["current", "inception"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                period === p
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-transparent border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              {p === "current" ? "2025–2026" : "Since Inception"}
            </button>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Portfolio NAV" value={formatUSD(totalNAV, true)} />
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

      {/* Analytics row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 px-4 py-3 flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Win Rate</span>
          <span className="text-lg font-mono font-bold text-white">{winRate}%</span>
          <span className="text-xs text-gray-600 mt-0.5">{ethReturns.filter((r) => r > 0).length}/{ethReturns.length} schools positive</span>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 px-4 py-3 flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Sharpe Ratio</span>
          <span className={`text-lg font-mono font-bold ${typeof sharpe === "string" || parseFloat(sharpe) >= 1 ? "text-primary" : parseFloat(sharpe) >= 0 ? "text-white" : "text-danger"}`}>{sharpe}</span>
          <span className="text-xs text-gray-600 mt-0.5">ETH return / std dev</span>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 px-4 py-3 flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Schools</span>
          <span className="text-lg font-mono font-bold text-white">{activeSchools.length}</span>
          <span className="text-xs text-gray-600 mt-0.5">active portfolios</span>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio NAV by School (Ranked)</h2>
          <NavBarChart schools={activeSchools} />
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">ETH Return — All Schools</h2>
          <EthReturnChart schools={activeSchools} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Top &amp; Bottom 3 — ETH Return</h2>
          <TopBottomChart schools={activeSchools} />
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Deployment % vs. NAV</h2>
          <DeploymentScatter schools={activeSchools} />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden mb-6">
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

      {/* ETH Holdings */}
      <EthHoldingsTable schools={schools} />

      {/* Recent Buys */}
      <RecentBuysFeed schools={schools} />

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
