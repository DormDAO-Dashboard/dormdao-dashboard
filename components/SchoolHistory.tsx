"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { formatUSD, formatPct } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";
import { cn } from "@/lib/utils";
import { SEASON_START_DATE } from "@/lib/seasonBaseline";

// "26-27 Season", from the season start year.
const SEASON_TAB_LABEL = (() => {
  const y = Number(SEASON_START_DATE.slice(2, 4));
  return `${y}-${y + 1} Season`;
})();

interface Snapshot {
  id: string;
  captured_at: string;
  school_name: string;
  nav_usd: number;
  eth_return_pct: number;
  usd_return_pct: number;
  deployed_pct: number;
  eth_balance: number;
  // ETH return since the school's inception baseline, and since this
  // season's start (null before it) — see app/api/snapshot/route.ts.
  all_time_eth_return_pct: number | null;
  season_eth_return_pct: number | null;
}

type View = "all" | "season";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function SchoolHistory({ schoolName }: { schoolName: string }) {
  const { theme } = useTheme();
  const light = theme === "light";
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");

  useEffect(() => {
    fetch(`/api/snapshot?school=${encodeURIComponent(schoolName)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setSnapshots(d.snapshots ?? []);
      })
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false));
  }, [schoolName]);

  const tick = light ? "#374151" : "#9ca3af";
  const grid = light ? "#e5e7eb" : "#374151";
  const ttBg = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const ttLbl = light ? "#111827" : "#f3f4f6";

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-8 text-center text-gray-700 dark:text-gray-400 text-sm">
        Loading history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-8 text-center text-danger text-sm">
        {error}
      </div>
    );
  }

  if (snapshots.length < 2) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-12 text-center">
        <div className="text-4xl mb-4">📈</div>
        <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Historical data is being collected</h3>
        <p className="text-gray-700 dark:text-gray-400 text-sm max-w-sm mx-auto">
          Portfolio snapshots are captured daily. Check back tomorrow to see NAV and return history for {schoolDisplayName(schoolName)}.
        </p>
        <p className="text-gray-700 dark:text-gray-400 text-xs mt-3">{snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} collected so far</p>
      </div>
    );
  }

  const shown = view === "season"
    ? snapshots.filter(s => s.captured_at.slice(0, 10) >= SEASON_START_DATE)
    : snapshots;
  const chartData = shown.map(s => ({
    date: formatDate(s.captured_at),
    nav: s.nav_usd,
    ethReturn: view === "season" ? s.season_eth_return_pct : s.all_time_eth_return_pct,
    usdReturn: s.usd_return_pct,
    ethBalance: s.eth_balance,
  }));

  const pill = (v: View, label: string) => (
    <button
      onClick={() => setView(v)}
      className={cn(
        "shrink-0 whitespace-nowrap text-xs px-2.5 py-1 rounded-full border transition-colors",
        view === v
          ? "bg-primary text-[#fff] border-primary"
          : "border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-400 bg-white dark:bg-transparent hover:border-gray-300 dark:hover:border-white/20"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {pill("all", "All-Time")}
        {pill("season", SEASON_TAB_LABEL)}
      </div>
      {/* NAV over time */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-4">NAV Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fill: tick, fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fill: tick, fontSize: 11 }} tickFormatter={(v) => formatUSD(v, true)} />
            <Tooltip
              formatter={(v) => [formatUSD(Number(v)), "NAV"]}
              contentStyle={{ background: ttBg, border: `1px solid ${ttBord}`, borderRadius: 8 }}
              labelStyle={{ color: ttLbl }}
            />
            <Line type="monotone" dataKey="nav" stroke="#34d399" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ETH Return over time */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-4">ETH Return Over Time
          <span className="font-normal text-xs ml-2">{view === "season" ? `since ${formatDate(SEASON_START_DATE + "T12:00:00Z")}` : "since inception"}</span>
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fill: tick, fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fill: tick, fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(v) => [formatPct(Number(v)), "ETH Return"]}
              contentStyle={{ background: ttBg, border: `1px solid ${ttBord}`, borderRadius: 8 }}
              labelStyle={{ color: ttLbl }}
            />
            <Line
              type="monotone"
              dataKey="ethReturn"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ETH Balance over time */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-4">ETH Balance Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fill: tick, fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fill: tick, fontSize: 11 }} tickFormatter={(v) => `${Number(v).toFixed(2)} ETH`} />
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(4)} ETH`, "ETH Balance"]}
              contentStyle={{ background: ttBg, border: `1px solid ${ttBord}`, borderRadius: 8 }}
              labelStyle={{ color: ttLbl }}
            />
            <Line
              type="monotone"
              dataKey="ethBalance"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
