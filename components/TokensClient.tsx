"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { formatUSD, formatPrice, formatPct } from "@/lib/utils";
import { TOKEN_META } from "@/lib/tokens";
import { TokenAllocationDonut } from "@/components/charts/TokenAllocationDonut";
import { TrendingUp, TrendingDown, Search } from "lucide-react";

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

type SortKey = "schools" | "price" | "change" | "exposure" | "conviction";

interface Props {
  initialTokens: TokenInfo[];
  initialPrices: Record<string, { usd: number; usd_24h_change: number }>;
}

export function TokensClient({ initialTokens, initialPrices }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("schools");
  const [chainFilter, setChainFilter] = useState("");
  const [search, setSearch] = useState("");

  const chains = useMemo(() => {
    const set = new Set<string>();
    for (const t of initialTokens) {
      t.chains.forEach((c) => set.add(c));
    }
    return Array.from(set).sort();
  }, [initialTokens]);

  // "DormDAO Top Picks" — most schools holding (at least 3)
  const topPicks = useMemo(() => {
    return [...initialTokens]
      .filter((t) => t.schoolCount >= 3)
      .sort((a, b) => b.schoolCount - a.schoolCount || a.ticker.localeCompare(b.ticker))
      .slice(0, 5);
  }, [initialTokens]);

  const sorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = initialTokens.filter((t) => {
      if (chainFilter && !t.chains.includes(chainFilter)) return false;
      if (q) {
        const meta = TOKEN_META[t.ticker];
        return t.ticker.toLowerCase().includes(q) || (meta?.name ?? "").toLowerCase().includes(q);
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "schools" || sortBy === "conviction") return b.schoolCount - a.schoolCount || a.ticker.localeCompare(b.ticker);
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
  }, [initialTokens, initialPrices, sortBy, chainFilter, search]);

  return (
    <>
      {/* DormDAO Top Picks */}
      {topPicks.length > 0 && !search && !chainFilter && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">DormDAO Top Picks</h2>
          <div className="flex flex-wrap gap-2">
            {topPicks.map((token) => {
              const price = initialPrices[token.ticker];
              const meta = TOKEN_META[token.ticker];
              const isUp = price ? price.usd_24h_change >= 0 : null;
              return (
                <Link key={token.ticker} href={`/tokens/${token.ticker.toLowerCase()}`}>
                  <div className="flex items-center gap-2 bg-gray-900/60 border border-gray-700 hover:border-primary/50 rounded-lg px-3 py-2 transition-all cursor-pointer">
                    <div>
                      <div className="text-xs text-gray-500">{meta?.name ?? token.ticker}</div>
                      <div className="font-mono font-bold text-white text-sm">${token.ticker}</div>
                    </div>
                    {price ? (
                      <div className="text-right">
                        <div className="font-mono text-sm text-white">{formatPrice(price.usd)}</div>
                        <div className={`text-xs font-mono ${isUp ? "text-primary" : "text-danger"}`}>
                          {formatPct(price.usd_24h_change)}
                        </div>
                      </div>
                    ) : null}
                    <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded ml-1">
                      {token.schoolCount} schools
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Aggregate token allocation */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">Aggregate Portfolio Allocation</h2>
        <p className="text-xs text-gray-500 mb-2">
          Share of total market value across every school&apos;s holdings combined. Top 9 tokens by value; the rest grouped as Other.
        </p>
        <TokenAllocationDonut tokens={initialTokens} prices={initialPrices} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens…"
            className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 w-44"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
        >
          <option value="schools">Sort: Schools</option>
          <option value="conviction">Sort: Conviction</option>
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
          const exposure = price && price.usd > 0 ? price.usd * token.totalTokens : 0;
          const isPremarket = !!meta?.premarket;
          const isVault = !!meta?.vault;
          const noPrice = isPremarket || isVault;
          const displayTicker = meta?.displayTicker ?? token.ticker;

          return (
            <Link key={token.ticker} href={`/tokens/${token.ticker.toLowerCase()}`}>
              <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4 hover:border-primary/40 hover:bg-gray-800/30 transition-all cursor-pointer h-full flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">{meta?.name ?? token.ticker}</div>
                    <div className="font-mono font-bold text-white">${displayTicker}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isVault ? (
                      <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-800/50 px-1.5 py-0.5 rounded">Vault</span>
                    ) : isPremarket ? (
                      <span className="text-xs bg-orange-900/40 text-orange-300 border border-orange-800/50 px-1.5 py-0.5 rounded">Pre-market</span>
                    ) : isUp !== null ? (
                      isUp
                        ? <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                        : <TrendingDown className="w-4 h-4 text-danger shrink-0" />
                    ) : null}
                  </div>
                </div>

                {noPrice ? (
                  <div className="text-xs text-gray-600 mt-1">
                    {isVault ? "DeFi vault position" : "Pre-market token"}
                  </div>
                ) : price && price.usd > 0 ? (
                  <>
                    <div className="font-mono text-lg font-semibold text-white">
                      {formatPrice(price.usd)}
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
                    {formatUSD(exposure)} exposure
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
        {sorted.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 text-sm">
            No tokens match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </>
  );
}
