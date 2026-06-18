"use client";
import { useState } from "react";
import Link from "next/link";
import { SchoolRow } from "@/lib/types";
import { SchoolLogo } from "@/components/SchoolLogo";
import { formatUSD, formatPct, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

type SortKey = "rank" | "nav" | "usdReturn" | "ethReturn" | "pctDeployed";

const YEARS = [
  { key: "2025-2026", label: "2025–2026" },
  { key: "2024-2025", label: "2024–2025" },
  { key: "2023-2024", label: "2023–2024" },
  { key: "all-time", label: "All-Time" },
] as const;

type YearKey = (typeof YEARS)[number]["key"];

function RankBadge({ rank }: { rank: number }) {
  const base = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0";
  if (rank === 1) return <div className={cn(base, "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40")}>{rank}</div>;
  if (rank === 2) return <div className={cn(base, "bg-gray-400/20 text-gray-300 ring-1 ring-gray-400/40")}>{rank}</div>;
  if (rank === 3) return <div className={cn(base, "bg-orange-600/20 text-orange-400 ring-1 ring-orange-500/40")}>{rank}</div>;
  return <div className={cn(base, "bg-gray-800 text-gray-500 text-xs")}>{rank}</div>;
}

function ReturnCell({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <div className={cn("flex items-center justify-end gap-1 font-mono", up ? "text-primary" : "text-danger")}>
      {up ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
      {formatPct(value)}
    </div>
  );
}

function LeaderboardTable({ schools, sortKey, setSortKey, asc, setAsc, showDeployed }: {
  schools: SchoolRow[];
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  asc: boolean;
  setAsc: (v: boolean) => void;
  showDeployed?: boolean;
}) {
  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc(!asc);
    else { setSortKey(key); setAsc(key === "rank"); }
  }

  const sorted = [...schools].sort((a, b) => {
    const mult = asc ? 1 : -1;
    if (sortKey === "rank") return (a.rank - b.rank) * mult;
    return ((a[sortKey] as number) - (b[sortKey] as number)) * mult;
  });

  const thCls = (key: SortKey) => cn(
    "px-5 py-3 text-right cursor-pointer select-none hover:text-gray-200 transition-colors",
    sortKey === key ? "text-primary" : "text-gray-500"
  );

  return (
    <div className="relative overflow-x-auto">
      <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-gray-900/80 to-transparent md:hidden z-10" />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs">
            <th className="text-left px-5 py-3 text-gray-500 w-16">Rank</th>
            <th className="text-left px-5 py-3 text-gray-500">School</th>
            <th className={thCls("nav")} onClick={() => toggleSort("nav")}>NAV {sortKey === "nav" ? (asc ? "↑" : "↓") : ""}</th>
            <th className={cn(thCls("usdReturn"), "hidden md:table-cell")} onClick={() => toggleSort("usdReturn")}>
              Return (USD){sortKey === "usdReturn" ? (asc ? " ↑" : " ↓") : ""}
            </th>
            <th className={thCls("ethReturn")} onClick={() => toggleSort("ethReturn")}>
              <span className="md:hidden">ETH Ret</span>
              <span className="hidden md:inline">Return (ETH)</span>
              {sortKey === "ethReturn" ? (asc ? " ↑" : " ↓") : ""}
            </th>
            {showDeployed && <th className={cn(thCls("pctDeployed"), "hidden md:table-cell")} onClick={() => toggleSort("pctDeployed")}>% Deployed {sortKey === "pctDeployed" ? (asc ? "↑" : "↓") : ""}</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const displayRank = sortKey === "rank" ? s.rank : i + 1;
            return (
              <tr key={s.slug} className={cn(
                "border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors",
                s.rank === 1 && sortKey === "rank" ? "bg-yellow-500/5" : ""
              )}>
                <td className="px-5 py-3">
                  <RankBadge rank={displayRank} />
                </td>
                <td className="px-5 py-3">
                  <Link href={`/schools/${s.slug}`} className="flex items-center gap-3 hover:text-primary transition-colors group">
                    <SchoolLogo name={s.name} size={28} />
                    <span className="font-semibold text-white group-hover:text-primary">{s.name}</span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-200">{formatUSD(s.nav, true)}</td>
                <td className="px-5 py-3 text-right hidden md:table-cell"><ReturnCell value={s.usdReturn} /></td>
                <td className="px-5 py-3 text-right"><ReturnCell value={s.ethReturn} /></td>
                {showDeployed && <td className="px-5 py-3 text-right font-mono text-gray-400 hidden md:table-cell">{formatPct(s.pctDeployed)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LeaderboardClient({
  schools,
  sinceInceptionSchools,
  schools2425,
  schools2324,
}: {
  schools: SchoolRow[];
  sinceInceptionSchools: SchoolRow[];
  schools2425: SchoolRow[];
  schools2324: SchoolRow[];
}) {
  const [year, setYear] = useState<YearKey>("2025-2026");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);

  const activeSchools =
    year === "2025-2026" ? schools
    : year === "2024-2025" ? (schools2425.length > 0 ? schools2425 : null)
    : year === "2023-2024" ? (schools2324.length > 0 ? schools2324 : null)
    : year === "all-time" ? (sinceInceptionSchools.length > 0 ? sinceInceptionSchools : null)
    : null;

  const displaySchools = activeSchools ?? schools;

  return (
    <div>
      {/* Year selector — mobile dropdown */}
      <div className="md:hidden mb-4">
        <select
          value={year}
          onChange={(e) => { setYear(e.target.value as YearKey); setSortKey("rank"); setAsc(true); }}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
        >
          {YEARS.map((y) => (
            <option key={y.key} value={y.key}>{y.label}</option>
          ))}
        </select>
      </div>

      {/* Year tabs — desktop */}
      <div className="hidden md:flex gap-0 mb-0 border-b border-gray-800">
        {YEARS.map((y) => (
          <button
            key={y.key}
            onClick={() => { setYear(y.key); setSortKey("rank"); setAsc(true); }}
            className={cn(
              "px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              year === y.key
                ? "border-primary text-white font-medium"
                : "border-transparent text-gray-500 hover:text-gray-300 font-normal"
            )}
          >
            {y.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-b-lg border border-t-0 border-gray-800 bg-gray-900/30 overflow-hidden">
        {activeSchools !== null ? (
          <LeaderboardTable
            schools={activeSchools}
            sortKey={sortKey}
            setSortKey={setSortKey}
            asc={asc}
            setAsc={setAsc}
            showDeployed={year === "2025-2026"}
          />
        ) : (
          <div className="py-16 text-center text-gray-500 text-sm">
            Historical data for {YEARS.find(y => y.key === year)?.label} coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
