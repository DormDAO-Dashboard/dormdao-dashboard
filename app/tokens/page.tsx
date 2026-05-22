"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatUSD, formatPct } from "@/lib/utils";
import { TOKEN_META } from "@/lib/tokens";
import { Skeleton } from "@/components/ui/Card";
import { TrendingUp, TrendingDown } from "lucide-react";

const ABBREV: Record<string, string> = {
  "Vanderbilt": "VAN", "Villanova": "VIL", "Boston College": "BC",
  "Purdue": "PUR", "Oregon": "ORE", "Michigan": "MICH",
  "Columbia": "COL", "USC": "USC", "Penn": "PENN",
  "Cornell": "COR", "St. Andrews": "STA", "Waterloo": "WAT",
  "NYU": "NYU", "Berkeley": "UCB", "Dartmouth": "DAR",
  "Texas": "TEX", "Cambridge": "CAM",
};

interface TokenInfo {
  ticker: string;
  schoolCount: number;
  schools: string[];
  totalTokens: number;
}

type SortKey = "schools" | "price" | "change" | "exposure";

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [prices, setPrices] = useState<Record<string, { usd: number; usd_24h_change: number }>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("schools");
  const [chainFilter, setChainFilter] = useState("");
  const [chains, setChains] = useState<string[]>([]);
  const [tokenChains, setTokenChains] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/sheets")
      .then((r) => r.json())
      .then((d) => {
        const map = new Map<string, { schools: Set<string>; totalTokens: number; chains: Set<string> }>();
        for (const school of d.schools ?? []) {
          for (const h of school.holdings ?? []) {
            if (!h.ticker) continue;
            if (!map.has(h.ticker)) {
              map.set(h.ticker, { schools: new Set(), totalTokens: 0, chains: new Set() });
            }
            const entry = map.get(h.ticker)!;
            entry.schools.add(school.name);
            entry.totalTokens += h.tokens ?? 0;
            if (h.blockchain) entry.chains.add(h.blockchain);
          }
        }

        const chainSet = new Set<string>();
        const chainMap: Record<string, string[]> = {};
        const list: TokenInfo[] = Array.from(map.entries()).map(([ticker, v]) => {
          const c = Array.from(v.chains);
          chainMap[ticker] = c;
          c.forEach((ch) => chainSet.add(ch));
          return {
            ticker,
            schoolCount: v.schools.size,
            schools: Array.from(v.schools).sort(),
            totalTokens: v.totalTokens,
          };
        });

        setTokenChains(chainMap);
        setChains(Array.from(chainSet).sort());
        setTokens(list);

        const tickers = list.map((t) => t.ticker).join(",");
        return fetch(`/api/prices?tickers=${encodeURIComponent(tickers)}`);
      })
      .then((r) => r?.json())
      .then((d) => d && setPrices(d.prices ?? {}))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const filtered = chainFilter
      ? tokens.filter((t) => tokenChains[t.ticker]?.includes(chainFilter))
      : tokens;

    return [...filtered].sort((a, b) => {
      if (sortBy === "schools") return b.schoolCount - a.schoolCount || a.ticker.localeCompare(b.ticker);
      if (sortBy === "price") {
        const pa = prices[a.ticker]?.usd ?? -1;
        const pb = prices[b.ticker]?.usd ?? -1;
        return pb - pa;
      }
      if (sortBy === "change") {
        const ca = prices[a.ticker]?.usd_24h_change ?? -Infinity;
        const cb = prices[b.ticker]?.usd_24h_change ?? -Infinity;
        return cb - ca;
      }
      if (sortBy === "exposure") {
        const ea = (prices[a.ticker]?.usd ?? 0) * a.totalTokens;
        const eb = (prices[b.ticker]?.usd ?? 0) * b.totalTokens;
        return eb - ea;
      }
      return 0;
    });
  }, [tokens, prices, sortBy, chainFilter, tokenChains]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Tokens</h1>
        <p className="text-gray-400 mt-1">
          {loading ? "Loading…" : `${tokens.length} tokens held across DormDAO portfolios`}
        </p>
      </div>

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
        {loading
          ? [...Array(12)].map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-16 mb-3" />
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))
          : sorted.map((token) => {
              const price = prices[token.ticker];
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
    </div>
  );
}
