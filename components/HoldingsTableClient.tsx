"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Holding } from "@/lib/types";
import { ExternalLink, Download, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type SortKey = "chain" | "tokens" | "costEth" | "purchasePrice" | "price" | "value" | "pnl" | "roiEth" | "pctPort" | "date";

// Investment dates aren't zero-padded (e.g. "2026/5/8" vs "2026/5/28"), so a
// plain string comparison sorts them lexicographically instead of
// chronologically. Parse to a real timestamp for sorting.
function parseDateMs(dateStr: string): number | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

function formatUSD2(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function exportCsv(holdings: Holding[], prices: Record<string, { usd: number }>, ethPrice: number, schoolName: string) {
  const headers = ["Token", "Chain", "Tokens", "Cost (ETH)", "Price (USD)", "Value (USD)", "% Portfolio", "Investment Date"];
  const rows = holdings.map((h) => {
    const price = prices[h.ticker];
    const value = price && h.tokens > 0 ? price.usd * h.tokens : null;
    return [
      h.ticker,
      h.blockchain,
      h.tokens > 0 ? h.tokens : "",
      h.costBasisEth > 0 ? h.costBasisEth : "",
      price ? price.usd : "",
      value !== null ? value.toFixed(2) : "",
      h.pctOfPortfolio > 0 ? h.pctOfPortfolio.toFixed(1) + "%" : "",
      h.investmentDate,
    ];
  });
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${schoolName.replace(/\s+/g, "-").toLowerCase()}-holdings.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ABBREV: Record<string, string> = {
  "Vanderbilt": "VAN", "Villanova": "VIL", "Boston College": "BC",
  "Purdue": "PUR", "Oregon": "ORE", "Michigan": "MICH",
  "Columbia": "COL", "USC": "USC", "Penn": "PENN",
  "Cornell": "COR", "St. Andrews": "STA", "Waterloo": "WAT",
  "NYU": "NYU", "Berkeley": "UCB", "Dartmouth": "DAR",
  "Texas": "TEX", "Cambridge": "CAM",
};

function abbrev(name: string) {
  return ABBREV[name] ?? name.slice(0, 3).toUpperCase();
}

function SortIcon({ col, sortKey, asc }: { col: SortKey; sortKey: SortKey; asc: boolean }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-700 dark:text-gray-400 inline ml-1" />;
  return asc
    ? <ChevronUp className="w-3 h-3 text-primary inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-primary inline ml-1" />;
}

interface HoldingsTableClientProps {
  holdings: Holding[];
  otherSchools: Record<string, string[]>;
  schoolName?: string;
}

export function HoldingsTableClient({ holdings, otherSchools, schoolName = "school" }: HoldingsTableClientProps) {
  const [prices, setPrices] = useState<Record<string, { usd: number }>>({});
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [asc, setAsc] = useState(false);

  const fetchPrices = useCallback(() => {
    const tickers = Array.from(new Set(holdings.map((h) => h.ticker).concat("ETH"))).join(",");
    fetch(`/api/prices?tickers=${encodeURIComponent(tickers)}`)
      .then((r) => r.json())
      .then((d) => setPrices(d.prices ?? {}))
      .finally(() => setLoading(false));
  }, [holdings]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "chain" || key === "date");
    }
  }

  // USD price per token at the time it was bought — exclusively the fixed
  // value from h.purchasePriceUsd (column R in the sheet, via
  // lib/sheets.ts's parseHoldings, or a positions-table override). This
  // deliberately never falls back to deriving a price from the ETH cost
  // basis + a CoinGecko historical lookup: that fallback used to silently
  // stand in for a real fixed price whenever the historical-price API had a
  // gap (rate limit, or the position predates its 365-day free-tier
  // history), so the column looked like it was "still calling an API"
  // instead of showing the manually-entered spreadsheet value. Missing a
  // fixed price now shows "—" rather than an API-derived guess.
  function purchasePriceOf(h: Holding): number | null {
    return h.purchasePriceUsd ?? null;
  }

  function getSortValue(h: Holding): number | string | null {
    const price = prices[h.ticker];
    const currentValue = price && h.tokens > 0
      ? price.usd * h.tokens
      : h.marketValueUsd ?? null;

    switch (sortKey) {
      case "chain": return h.blockchain || "";
      case "tokens": return h.tokens > 0 ? h.tokens : null;
      case "costEth": return h.costBasisEth > 0 ? h.costBasisEth : null;
      case "purchasePrice": return purchasePriceOf(h);
      case "price": {
        if (price) return price.usd;
        return h.marketValueUsd && h.tokens > 0 ? h.marketValueUsd / h.tokens : null;
      }
      case "value": return currentValue;
      case "pnl": return h.gainUsd ?? null;
      case "roiEth": return h.roiEthPct ?? null;
      case "pctPort": return h.pctOfPortfolio > 0 ? h.pctOfPortfolio : null;
      case "date": return parseDateMs(h.investmentDate);
    }
  }

  // ETH is the fund's idle treasury balance, not an acquired position — it's
  // the baseline everything else's performance gets measured against, so it
  // stays pinned to the top row regardless of whatever column the table is
  // currently sorted by, rather than sorting in alongside real positions.
  const ethRows = holdings.filter((h) => h.ticker === "ETH");
  const otherHoldings = holdings.filter((h) => h.ticker !== "ETH");

  const sortedHoldings = [...ethRows, ...otherHoldings.sort((a, b) => {
    const aVal = getSortValue(a);
    const bVal = getSortValue(b);
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    const mult = asc ? 1 : -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * mult;
    }
    return ((aVal as number) - (bVal as number)) * mult;
  })];

  const thClass = "px-5 py-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300 transition-colors";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-700 dark:text-gray-400">
            <th className="text-left px-5 py-3">Token</th>
            <th className={`text-left ${thClass}`} onClick={() => toggleSort("chain")}>
              Chain <SortIcon col="chain" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("tokens")}>
              Tokens <SortIcon col="tokens" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("costEth")}>
              Cost (ETH) <SortIcon col="costEth" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("purchasePrice")}>
              Purchase Price <SortIcon col="purchasePrice" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("price")}>
              Price <SortIcon col="price" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("value")}>
              Value <SortIcon col="value" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("pnl")}>
              P&amp;L (USD) <SortIcon col="pnl" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("roiEth")}>
              ROI (ETH) <SortIcon col="roiEth" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("pctPort")}>
              % Port. <SortIcon col="pctPort" sortKey={sortKey} asc={asc} />
            </th>
            <th className={`text-right ${thClass}`} onClick={() => toggleSort("date")}>
              Date <SortIcon col="date" sortKey={sortKey} asc={asc} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedHoldings.map((h, i) => {
            const price = prices[h.ticker];
            const currentValue = price && h.tokens > 0
              ? price.usd * h.tokens
              : h.marketValueUsd ?? null;
            const pricePerToken = price
              ? price.usd
              : h.marketValueUsd && h.tokens > 0
                ? h.marketValueUsd / h.tokens
                : null;
            const others = otherSchools[h.ticker] ?? [];

            // P&L is exclusively h.gainUsd — server-computed strictly from a
            // fixed purchase price and live token price (lib/positions.ts's
            // computeSchoolMetrics), never a derived guess. No fixed
            // purchase price means no P&L to show, not an estimated one.
            const pnl: number | null = h.gainUsd ?? null;
            const pnlPct: number | null = h.roiUsdPct ?? null;

            const roiEthPct = h.roiEthPct ?? null;
            const purchasePrice = purchasePriceOf(h);
            const isEthTreasury = h.ticker === "ETH";

            return (
              <tr
                key={`${h.ticker}-${h.investmentDate}-${i}`}
                className={
                  isEthTreasury
                    ? "border-b border-gray-800/50 bg-black/[0.03] dark:bg-white/[0.045] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                    : "border-b border-gray-800/50 hover:bg-gray-800/30"
                }
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/tokens/${h.ticker.toLowerCase()}`}
                    className="font-mono font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    {isEthTreasury ? "$ETH Treasury" : `$${h.ticker}`}
                    <ExternalLink className="w-3 h-3 opacity-40" />
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-700 dark:text-gray-400 text-xs">{h.blockchain || "—"}</td>
                <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-gray-400">
                  {h.tokens !== 0
                    ? h.tokens.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-gray-400 whitespace-nowrap">
                  {h.costBasisEth > 0 ? `${h.costBasisEth.toFixed(2)} ETH` : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-gray-400">
                  {purchasePrice !== null ? formatUSD2(purchasePrice) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-gray-400">
                  {loading ? "…" : pricePerToken !== null ? formatUSD2(pricePerToken) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-gray-400">
                  {loading ? "…" : currentValue !== null ? formatUSD2(currentValue) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono whitespace-nowrap">
                  {loading ? (
                    <span className="text-gray-700 dark:text-gray-400">…</span>
                  ) : pnl !== null ? (
                    <span className={pnl >= 0 ? "text-primary" : "text-danger"}>
                      {pnl >= 0 ? "+" : ""}{formatUSD2(pnl)}
                      {pnlPct !== null && (
                        <span className="text-xs ml-1 opacity-70">
                          ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  {roiEthPct !== null ? (
                    <span className={roiEthPct >= 0 ? "text-primary" : "text-danger"}>
                      {roiEthPct >= 0 ? "+" : ""}{roiEthPct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-gray-400">
                  {h.pctOfPortfolio > 0 ? `${h.pctOfPortfolio.toFixed(1)}%` : "—"}
                </td>
                <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-400 text-xs">
                  {h.investmentDate || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
