"use client";
import { KpiCard } from "@/components/ui/Card";
import { NavBarChart } from "@/components/charts/NavBarChart";
import { EthReturnChart } from "@/components/charts/EthReturnChart";
import { TopBottomChart } from "@/components/charts/TopBottomChart";
import { DeploymentScatter } from "@/components/charts/ScatterChart";
import { SortableLeaderboard } from "@/components/SortableLeaderboard";
import { SchoolRow, DaoStats } from "@/lib/types";
import { formatUSD, formatPct } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function computeStats(schools: SchoolRow[]): DaoStats {
  if (!schools.length)
    return { totalNAV: 0, avgUsdReturn: 0, avgEthReturn: 0, schoolCount: 0, topSchool: "—", avgDeployed: 0 };
  return {
    totalNAV: schools.reduce((s, x) => s + x.nav, 0),
    avgUsdReturn: schools.reduce((s, x) => s + x.usdReturn, 0) / schools.length,
    avgEthReturn: schools.reduce((s, x) => s + x.ethReturn, 0) / schools.length,
    schoolCount: schools.length,
    topSchool: schools[0]?.name ?? "—",
    avgDeployed: schools.reduce((s, x) => s + x.pctDeployed, 0) / schools.length,
  };
}

export function DashboardClient({ schools }: { schools: SchoolRow[] }) {
  const stats = computeStats(schools);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Portfolio NAV" value={formatUSD(stats.totalNAV, true)} />
        <KpiCard
          label="Avg USD Return"
          value={formatPct(stats.avgUsdReturn)}
          positive={stats.avgUsdReturn >= 0}
        />
        <KpiCard
          label="Avg ETH Return"
          value={formatPct(stats.avgEthReturn)}
          positive={stats.avgEthReturn >= 0}
        />
        <KpiCard label="Avg Deployment" value={formatPct(stats.avgDeployed)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio NAV by School (Ranked)</h2>
          <NavBarChart schools={schools} />
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">ETH Return — All Schools</h2>
          <EthReturnChart schools={schools} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Top & Bottom 3 — ETH Return</h2>
          <TopBottomChart schools={schools} />
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Deployment % vs. NAV</h2>
          <DeploymentScatter schools={schools} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">
            School Leaderboard — All {schools.length}
          </h2>
          <Link
            href="/schools"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Schools tab <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <SortableLeaderboard schools={schools} />
      </div>
    </>
  );
}
