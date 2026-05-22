"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { formatUSD, formatPct } from "@/lib/utils";
import { TOKEN_META } from "@/lib/tokens";
import { TrendingUp, TrendingDown } from "lucide-react";

const ABBREV: Record<string, string> = {
  "Vanderbilt": "VAN", "Villanova": "VIL", "Boston College": "BC",
  "Purdue": "PUR", "Oregon": "ORE", "Michigan": "MICH",
  "Columbia": "COL", "USC": "USC", "Penn": "PENN",
  "Cornell": "COR", "St. Andrews": "STA", "Waterloo": "WAT",
  "NYU": "NYU", "Berkeley": "UCB", "Dartmouth": "DAR",
  "Texas": "TEX", "Cambridge": "CAM",
};

export interface TokenInfo {
  ticker: string;
  schoolCount: number;
  schools: string[];
  totalTokens: number;
  chains: string[];
}

type SortKey = "schools" | "price" | "change" | "exposure";

interface Props {
  initialTokens: TokenInfo[];
  initialPrices: Record<string, { usd: number; usd_24h_change: number }>;
}

export function TokensClient({ initialTokens, initialPrices }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("schools");
  const [chainFilter, setChainFilter] = useState("");

  const chains = useMemo(() => {
    const set = new Set<string>();
    for (const t of initialTokens) {
      t.chains.forEach((c) => set.add(c));
    }
    return Array.from(set).sort();
  }, [initialTokens]);

  const sorted = useMemo(() => {
    const filtered = chainFilter
      ? initialTokens.filter((t) => t.chains.includes(chainFilter))
      : initialTokens;

    return [...filtered].sort((a, b) => {
      if (sortBy === "schools") return b.schoolCount - a.schoolCount || a.ticker.localeCompare(b.ticker);
      if (sortBy === "price") {
        const pa = initialPrices[a.ticker]?.usd ?? -1;
        const pb = initialPrices[b.ticker]?.usd ?? -1;
        return pb - pa;
      }
      if (sortBy === "change") {
        const ca = initialPrices[a.ticker]?.usd_24h_change ?? -Infinity;
        const cb = initialPrices[b.ticker]?.usd_24h_change ?? -Infinity;
        return cb - ca;
      }
      if (sortBy === "exposure") {
        const ea = (initialPrices[a.ticker]?.usd ?? 0) * a.totalTokens;
        const eb = (initialPrices[b.ticker]?.usd ?? 0) * b.totalTokens;
        return eb - ea;
      }
      return 0;
    });
  }, [initialTokens, initialPrices, sortBy, chainFilter]);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
        >
          <option value="schools">Sort: Schools</option>
          <option value="price">Sort: Price</option>
          <option value="change">Sort: 24h Change</option>
          <option value="exposure">Sort: USD Exposure</option>
        </select>
        {chains.length > 0 && (
          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Chains</option>
            {chains.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((token) => {
          const price = initialPrices[token.ticker];
          const isUp = price ? price.usd_24h_change >= 0 : null;
          const meta = TOKEN_META[token.ticker];
          const exposure = price ? price.usd * token.totalTokens : 0;

          return (
            <Link key={token.ticker} href={`/tokens/${token.ticker.toLowerCase()}`}>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-primary/40 hover:bg-gray-800/50 transition-all cursor-pointer h-full flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">{meta?.name ?? token.ticker}</div>
                    <div className="font-mono font-bold text-white">${token.ticker}</div>
                  </div>
                  {isUp !== null && (
                    isUp
                      ? <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                      : <TrendingDown className="w-4 h-4 text-danger shrink-0" />
                  )}
                </div>

                {price ? (
                  <>
                    <div className="font-mono text-lg font-semibold text-white">
                      {formatUSD(price.usd)}
                    </div>
                    <div className={`text-xs font-mono ${isUp ? "text-primary" : "text-danger"}`}>
                      {formatPct(price.usd_24h_change)} 24h
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-600 mt-1">Price unavailable</div>
                )}

                {exposure > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formatUSD(exposure, true)} exposure
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2">
                  {token.schoolCount} school{token.schoolCount !== 1 ? "s" : ""}
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {token.schools.slice(0, 5).map((s) => (
                    <span
                      key={s}
                      className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded"
                    >
                      {ABBREV[s] ?? s.slice(0, 3).toUpperCase()}
                    </span>
                  ))}
                  {token.schools.length > 5 && (
                    <span className="text-xs text-gray-600">+{token.schools.length - 5}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
