"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { formatUSD, formatPct } from "@/lib/utils";

interface Snapshot {
  id: string;
  captured_at: string;
  school_name: string;
  nav_usd: number;
  eth_return_pct: number;
  usd_return_pct: number;
  deployed_pct: number;
  eth_balance: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function SchoolHistory({ schoolName }: { schoolName: string }) {
  const { theme } = useTheme();
  const light = theme === "light";
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500 text-sm">
        Loading history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-danger text-sm">
        {error}
      </div>
    );
  }

  if (snapshots.length < 2) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
        <div className="text-4xl mb-4">📈</div>
        <h3 className="text-white font-semibold mb-2">Historical data is being collected</h3>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Portfolio snapshots are captured daily. Check back tomorrow to see NAV and return history for {schoolName}.
        </p>
        <p className="text-gray-600 text-xs mt-3">{snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} collected so far</p>
      </div>
    );
  }

  const chartData = snapshots.map(s => ({
    date: formatDate(s.captured_at),
    nav: s.nav_usd,
    ethReturn: s.eth_return_pct,
    usdReturn: s.usd_return_pct,
    ethBalance: s.eth_balance,
  }));

  return (
    <div className="space-y-6">
      {/* NAV over time */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">NAV Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fill: tick, fontSize: 11 }} />
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
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">ETH Return Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fill: tick, fontSize: 11 }} />
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
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ETH Balance over time */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">ETH Balance Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fill: tick, fontSize: 11 }} />
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
