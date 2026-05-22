"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Holding } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

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
}

export function HoldingsTableClient({ holdings, otherSchools }: HoldingsTableClientProps) {
  const [prices, setPrices] = useState<Record<string, { usd: number }>>({});
  const [ethPrice, setEthPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tickers = Array.from(new Set(holdings.map((h) => h.ticker).concat("ETH"))).join(",");
    fetch(`/api/prices?tickers=${encodeURIComponent(tickers)}`)
      .then((r) => r.json())
      .then((d) => {
        setPrices(d.prices ?? {});
        setEthPrice(d.prices?.ETH?.usd ?? 0);
      })
      .finally(() => setLoading(false));
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
            const costUsd = ethPrice > 0 && h.costBasisEth > 0 ? h.costBasisEth * ethPrice : null;
            const pnl = currentValue !== null && costUsd !== null ? currentValue - costUsd : null;
            const pnlPct = pnl !== null && costUsd !== null && costUsd > 0
              ? (pnl / costUsd) * 100 : null;
            const others = otherSchools[h.ticker] ?? [];

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
                  {h.tokens > 0
                    ? h.tokens.toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {h.costBasisEth > 0 ? `${h.costBasisEth} ETH` : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {loading ? "…" : price ? formatUSD(price.usd) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-gray-300">
                  {loading ? "…" : currentValue !== null ? formatUSD(currentValue, true) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  {loading ? (
                    <span className="text-gray-500">…</span>
                  ) : pnl !== null ? (
                    <span className={pnl >= 0 ? "text-primary" : "text-danger"}>
                      {pnl >= 0 ? "+" : ""}{formatUSD(pnl, true)}
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
