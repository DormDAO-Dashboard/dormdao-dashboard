"use client";
import { useState } from "react";
import Link from "next/link";
import { SchoolRow } from "@/lib/types";
import { formatNav, formatUSD, formatPct } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type SortKey = "rank" | "nav" | "usdReturn" | "ethReturn" | "pctDeployed";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex w-7 h-7 items-center justify-center text-xs font-bold rounded-full bg-yellow-400 text-yellow-900">{rank}</span>;
  if (rank === 2) return <span className="inline-flex w-7 h-7 items-center justify-center text-xs font-bold rounded-full bg-gray-300 text-gray-700">{rank}</span>;
  if (rank === 3) return <span className="inline-flex w-7 h-7 items-center justify-center text-xs font-bold rounded-full bg-amber-600 text-white">{rank}</span>;
  return <span className="text-gray-400 font-mono">#{rank}</span>;
}

function SortIcon({ col, sortKey, asc }: { col: SortKey; sortKey: SortKey; asc: boolean }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-600 inline ml-1" />;
  return asc
    ? <ChevronUp className="w-3 h-3 text-primary inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-primary inline ml-1" />;
}

export function SortableLeaderboard({ schools }: { schools: SchoolRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else { setSortKey(key); setAsc(key === "rank"); }
  }

  const sorted = [...schools].sort((a, b) => {
    const mult = asc ? 1 : -1;
    if (sortKey === "rank") return (a.rank - b.rank) * mult;
    return ((a[sortKey] as number) - (b[sortKey] as number)) * mult;
  });

  const thClass = "px-5 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-500">
            <th className={`text-left ${thClass}`} onClick={() => toggleSort("rank")}>
              Rank <SortIcon col="rank" sortKey={sortKey} asc={asc} />
            </th>
            <th className="text-left px-5 py-3">School</th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("nav")}>
              NAV <SortIcon col="nav" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("usdReturn")}>
              Return (USD) <SortIcon col="usdReturn" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("ethReturn")}>
              ETH Return <SortIcon col="ethReturn" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("pctDeployed")}>
              % Deployed <SortIcon col="pctDeployed" sortKey={sortKey} asc={asc} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={s.slug}
              className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors${i === 0 ? " bg-yellow-400/15" : i === 1 ? " bg-gray-400/15" : i === 2 ? " bg-amber-600/15" : ""}`}
            >
              <td className="px-5 py-3"><RankBadge rank={s.rank} /></td>
              <td className="px-5 py-3">
                <Link
                  href={`/schools/${s.slug}`}
                  className="text-gray-900 dark:text-white hover:text-primary font-medium transition-colors"
                >
                  {schoolDisplayName(s.name)}
                </Link>
              </td>
              <td className="px-5 py-3 text-right font-mono text-gray-200">
                {formatNav(s.nav)}
              </td>
              <td className={`px-5 py-3 text-right font-mono ${s.usdReturn >= 0 ? "text-primary" : "text-danger"}`}>
                {formatPct(s.usdReturn, false)}
              </td>
              <td className={`px-5 py-3 text-right font-mono ${s.ethReturn >= 0 ? "text-primary" : "text-danger"}`}>
                {formatPct(s.ethReturn, false)}
              </td>
              <td className="px-5 py-3 text-right font-mono text-gray-400">
                {formatPct(s.pctDeployed, false)}
              </td>
            </tr>
          ))}
          {schools.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-gray-500 text-sm">
                No data available — check your Google Sheets configuration
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
