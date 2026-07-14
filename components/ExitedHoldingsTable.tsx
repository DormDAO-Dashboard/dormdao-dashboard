"use client";
import Link from "next/link";
import { ExitedHolding } from "@/lib/types";
import { formatUSD, formatPct, cn } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";
import { TrendingUp, TrendingDown } from "lucide-react";

function ExitTypeBadge({ type }: { type: ExitedHolding["exitType"] }) {
  if (type === "exit") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger/20 text-danger border border-danger/30">
        Exit
      </span>
    );
  }
  if (type === "trim") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
        Trim
      </span>
    );
  }
  return null;
}

function ReturnCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-600">—</span>;
  const up = value >= 0;
  return (
    <span className={cn("flex items-center justify-end gap-1 font-mono", up ? "text-primary" : "text-danger")}>
      {up ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
      {formatPct(value)}
    </span>
  );
}

interface Props {
  holdings: ExitedHolding[];
  showSchool?: boolean;
  schoolName?: string;
  schoolSlug?: string;
}

export function ExitedHoldingsTable({ holdings, showSchool = false, schoolName, schoolSlug }: Props) {
  if (holdings.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-gray-500">No exited or trimmed positions recorded.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-500">
            {showSchool && <th className="text-left px-5 py-3">School</th>}
            <th className="text-left px-5 py-3">Token</th>
            <th className="text-left px-5 py-3">Type</th>
            <th className="text-right px-5 py-3">Cost Basis (ETH)</th>
            <th className="text-right px-5 py-3">Gain (USD)</th>
            <th className="text-right px-5 py-3">ROI (ETH)</th>
            <th className="text-right px-5 py-3">ROI (USD)</th>
            <th className="text-right px-5 py-3">Invested</th>
            <th className="text-right px-5 py-3">Exited</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr key={`${h.ticker}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
              {showSchool && (
                <td className="px-5 py-3">
                  {schoolSlug && schoolName ? (
                    <Link
                      href={`/schools/${schoolSlug}`}
                      className="text-gray-300 text-xs hover:text-primary transition-colors"
                    >
                      {schoolDisplayName(schoolName)}
                    </Link>
                  ) : (
                    <span className="text-gray-300 text-xs">{schoolDisplayName(schoolName)}</span>
                  )}
                </td>
              )}
              <td className="px-5 py-3">
                <Link
                  href={`/tokens/${h.ticker.toLowerCase()}`}
                  className="font-mono font-semibold text-white hover:text-primary transition-colors"
                >
                  ${h.ticker}
                </Link>
              </td>
              <td className="px-5 py-3">
                <ExitTypeBadge type={h.exitType} />
              </td>
              <td className="px-5 py-3 text-right font-mono text-gray-400 text-xs">
                {h.costBasisEth !== 0 ? `${h.costBasisEth.toFixed(3)} ETH` : "—"}
              </td>
              <td className="px-5 py-3 text-right font-mono text-xs">
                {h.gainUsd !== 0 ? (
                  <span className={h.gainUsd >= 0 ? "text-primary" : "text-danger"}>
                    {h.gainUsd >= 0 ? "+" : ""}{formatUSD(h.gainUsd)}
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-right">
                <ReturnCell value={h.roiEthPct} />
              </td>
              <td className="px-5 py-3 text-right">
                <ReturnCell value={h.roiUsdPct} />
              </td>
              <td className="px-5 py-3 text-right text-gray-500 text-xs">
                {h.investmentDate || "—"}
              </td>
              <td className="px-5 py-3 text-right text-gray-500 text-xs">
                {h.exitDate || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
