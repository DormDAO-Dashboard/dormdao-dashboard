"use client";
import { useState } from "react";
import Link from "next/link";
import { SchoolRow } from "@/lib/types";
import { formatUSD, formatPct } from "@/lib/utils";
import { SchoolLogo } from "@/components/SchoolLogo";
import { Search } from "lucide-react";

type SortKey = "rank" | "nav" | "usdReturn" | "ethReturn";

export function SchoolsClient({ initialSchools }: { initialSchools: SchoolRow[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rank");

  const filtered = initialSchools
    .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "rank") return a.rank - b.rank;
      if (sortBy === "nav") return b.nav - a.nav;
      if (sortBy === "usdReturn") return b.usdReturn - a.usdReturn;
      if (sortBy === "ethReturn") return b.ethReturn - a.ethReturn;
      return 0;
    });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search schools…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
        >
          <option value="rank">Sort: Rank</option>
          <option value="nav">Sort: NAV</option>
          <option value="usdReturn">Sort: USD Return</option>
          <option value="ethReturn">Sort: ETH Return</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <Link key={s.slug} href={`/schools/${s.slug}`}>
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 hover:border-primary/40 hover:bg-gray-800/30 transition-all cursor-pointer h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <SchoolLogo name={s.name} size={32} />
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-1">Rank #{s.rank}</div>
                    <h2 className="text-white font-semibold">{s.name}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-medium">ETH ROI</span>
                  <span className={`text-sm font-mono font-bold ${s.ethReturn >= 0 ? "text-primary" : "text-danger"}`}>
                    {formatPct(s.ethReturn)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">NAV</div>
                  <div className="font-mono text-gray-200">{formatUSD(s.nav, true)}</div>
                </div>
                <div>
                  <div className="text-gray-500">USD Return</div>
                  <div className={`font-mono ${s.usdReturn >= 0 ? "text-primary" : "text-danger"}`}>
                    {formatPct(s.usdReturn)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Avg Entry FDV</div>
                  <div className="font-mono text-gray-400">{formatUSD(s.avgEntryFdv, true)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Deployed</div>
                  <div className="font-mono text-gray-400">{formatPct(s.pctDeployed)}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No schools match &quot;{query}&quot;
        </div>
      )}
    </>
  );
}
