"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Holding } from "@/lib/types";
import { formatUSD, formatPrice } from "@/lib/utils";
import { ExternalLink, Download } from "lucide-react";

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

interface HoldingsTableClientProps {
  holdings: Holding[];
  otherSchools: Record<string, string[]>;
  schoolName?: string;
}

export function HoldingsTableClient({ holdings, otherSchools, schoolName = "school" }: HoldingsTableClientProps) {
  const [prices, setPrices] = useState<Record<string, { usd: number }>>({});
  const [ethPrice, setEthPrice] = useState(0);
  // date string → historical ETH price USD
  const [historicalEth, setHistoricalEth] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

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

  // Fetch historical ETH prices for holdings that lack gainUsd from the sheet
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-500">
            <th className="text-left px-5 py-3">Token</th>
            <th className="text-left px-5 py-3">Chain</th>
            <th className="text-right px-5 py-3">Tokens</th>
            <th className="text-right px-5 py-3">Cost (ETH)</th>
            <th className="text-right px-5 py-3">Price</th>
            <th className="text-right px-5 py-3">Value</th>
            <th className="text-right px-5 py-3">P&amp;L</th>
            <th className="text-right px-5 py-3">% Port.</th>
            <th className="text-right px-5 py-3">Also held by</th>
            <th className="text-right px-5 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => {
            const price = prices[h.ticker];
            const currentValue = price && h.tokens > 0 ? price.usd * h.tokens : null;
            const others = otherSchools[h.ticker] ?? [];

            // P&L: prefer sheet's pre-computed Gain(USD), then historical ETH, then current ETH
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
                  {loading ? "…" : price ? formatPrice(price.usd) : "—"}
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
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {h.pctOfPortfolio > 0 ? `${h.pctOfPortfolio.toFixed(1)}%` : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  {others.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {others.slice(0, 3).map((s, j) => (
                        <span key={j} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                          {abbrev(s)}
                        </span>
                      ))}
                      {others.length > 3 && (
                        <span className="text-xs text-gray-500">+{others.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
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
