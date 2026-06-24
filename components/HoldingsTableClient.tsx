"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Holding } from "@/lib/types";
import { formatUSD, formatPrice } from "@/lib/utils";
import { ExternalLink, Download, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type SortKey = "chain" | "tokens" | "costEth" | "price" | "value" | "pnl" | "roiEth" | "pctPort" | "date";

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
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-600 inline ml-1" />;
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
  const [ethPrice, setEthPrice] = useState(0);
  const [historicalEth, setHistoricalEth] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [asc, setAsc] = useState(false);

  const fetchPrices = useCallback(() => {
    const tickers = Array.from(new Set(holdings.map((h) => h.ticker).concat("ETH"))).join(",");
    fetch(`/api/prices?tickers=${encodeURIComponent(tickers)}`)
      .then((r) => r.json())
      .then((d) => {
        setPrices(d.prices ?? {});
        setEthPrice(d.prices?.ETH?.usd ?? 0);
      })
      .finally(() => setLoading(false));
  }, [holdings]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  useEffect(() => {
    const datesNeeded = Array.from(new Set(
      holdings
        .filter((h) => h.gainUsd === undefined && h.investmentDate && h.costBasisEth > 0)
        .map((h) => h.investmentDate)
    ));
    if (datesNeeded.length === 0) return;
    fetch(`/api/eth-price-history?dates=${encodeURIComponent(datesNeeded.join(","))}`)
      .then((r) => r.json())
      .then((d) => setHistoricalEth(d.prices ?? {}))
      .catch(() => {});
  }, [holdings]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "chain" || key === "date");
    }
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
      case "price": {
        if (price) return price.usd;
        return h.marketValueUsd && h.tokens > 0 ? h.marketValueUsd / h.tokens : null;
      }
      case "value": return currentValue;
      case "pnl": {
        if (h.gainUsd !== undefined) return h.gainUsd;
        const ethAtPurchase = historicalEth[h.investmentDate] || ethPrice;
        const costUsd = ethAtPurchase > 0 && h.costBasisEth > 0
          ? h.costBasisEth * ethAtPurchase : null;
        return currentValue !== null && costUsd !== null ? currentValue - costUsd : null;
      }
      case "roiEth": return h.roiEthPct ?? null;
      case "pctPort": return h.pctOfPortfolio > 0 ? h.pctOfPortfolio : null;
      case "date": return h.investmentDate || "";
    }
  }

  const sortedHoldings = [...holdings].sort((a, b) => {
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
  });

  const thClass = "px-5 py-3 cursor-pointer select-none hover:text-gray-300 transition-colors";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-500">
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

            let pnl: number | null = null;
            let pnlPct: number | null = null;

            if (h.gainUsd !== undefined) {
              pnl = h.gainUsd;
              pnlPct = h.roiUsdPct ?? null;
            } else {
              const ethAtPurchase = historicalEth[h.investmentDate] || ethPrice;
              const costUsd = ethAtPurchase > 0 && h.costBasisEth > 0
                ? h.costBasisEth * ethAtPurchase : null;
              pnl = currentValue !== null && costUsd !== null ? currentValue - costUsd : null;
              pnlPct = pnl !== null && costUsd !== null && costUsd > 0
                ? (pnl / costUsd) * 100 : null;
            }

            const roiEthPct = h.roiEthPct ?? null;

            return (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-5 py-3">
                  <Link
                    href={`/tokens/${h.ticker.toLowerCase()}`}
                    className="font-mono font-semibold text-white hover:text-primary transition-colors flex items-center gap-1"
                  >
                    ${h.ticker}
                    <ExternalLink className="w-3 h-3 opacity-40" />
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">{h.blockchain || "—"}</td>
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {h.tokens !== 0
                    ? h.tokens.toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {h.costBasisEth > 0 ? `${h.costBasisEth} ETH` : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {loading ? "…" : pricePerToken !== null ? formatPrice(pricePerToken) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {loading ? "…" : currentValue !== null ? formatUSD(currentValue) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  {loading ? (
                    <span className="text-gray-500">…</span>
                  ) : pnl !== null ? (
                    <span className={pnl >= 0 ? "text-primary" : "text-danger"}>
                      {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                      {pnlPct !== null && (
                        <span className="text-xs ml-1 opacity-70">
                          ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  {roiEthPct !== null ? (
                    <span className={roiEthPct >= 0 ? "text-primary" : "text-danger"}>
                      {roiEthPct >= 0 ? "+" : ""}{roiEthPct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {h.pctOfPortfolio > 0 ? `${h.pctOfPortfolio.toFixed(1)}%` : "—"}
                </td>
                <td className="px-5 py-3 text-right text-gray-500 text-xs">
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
