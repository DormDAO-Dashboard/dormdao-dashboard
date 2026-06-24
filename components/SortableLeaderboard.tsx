"use client";
import { useState } from "react";
import Link from "next/link";
import { SchoolRow } from "@/lib/types";
import { formatUSD, formatPct } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type SortKey = "rank" | "nav" | "usdReturn" | "ethReturn" | "pctDeployed";

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

  const thClass = "px-5 py-3 cursor-pointer hover:text-gray-300 select-none";

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
          {sorted.map((s) => (
            <tr
              key={s.slug}
              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
            >
              <td className="px-5 py-3 text-gray-400 font-mono">#{s.rank}</td>
              <td className="px-5 py-3">
                <Link
                  href={`/schools/${s.slug}`}
                  className="text-white hover:text-primary font-medium transition-colors"
                >
                  {s.name}
                </Link>
              </td>
              <td className="px-5 py-3 text-right font-mono text-gray-200">
                {formatUSD(s.nav, true)}
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
