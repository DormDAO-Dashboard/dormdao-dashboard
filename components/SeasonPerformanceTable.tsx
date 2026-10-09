"use client";
import type { TokenSeasonRow } from "@/lib/seasonPerformance";
import { formatUSD, formatPct, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

function ReturnCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-700 dark:text-gray-400">—</span>;
  if (value === 0) return <span className="text-gray-700 dark:text-gray-400">—</span>;
  const up = value >= 0;
  return (
    <span className={cn("flex items-center justify-end gap-1 font-mono", up ? "text-primary" : "text-danger")}>
      {up ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
      {formatPct(value)}
    </span>
  );
}

function StatusNote({ status }: { status: TokenSeasonRow["status"] }) {
  if (status === "new") {
    return <div className="text-xs text-gray-700 dark:text-gray-400">since buy — no season-start baseline</div>;
  }
  if (status === "exited") {
    return <div className="text-xs text-gray-700 dark:text-gray-400">exited this season</div>;
  }
  return null;
}

interface Props {
  rows: Record<string, TokenSeasonRow>;
  sinceDateLabel: string;
  // false when this school's fixed Leaderboard baseline is too far off this
  // system's own recorded season-start NAV to scale against safely (see
  // lib/seasonPerformance.ts's RECONCILE_THRESHOLD) — every value below is
  // then the real recorded number, unscaled, and won't sum to the
  // Leaderboard's season return for this school.
  reconciledToLeaderboard: boolean;
}

// Every token the school held or traded this season — active positions
// (trims folded in), fully exited positions, and anything bought and sold
// again all within the season. Baseline values are scaled so they sum to
// the Leaderboard's own fixed season-start NAV figure — see
// lib/seasonPerformance.ts for why that differs from this system's own
// recorded Oct-1 snapshot number.
export function SeasonPerformanceTable({ rows, sinceDateLabel, reconciledToLeaderboard }: Props) {
  const list = Object.values(rows).sort((a, b) => (b.valueNowUsd ?? 0) - (a.valueNowUsd ?? 0));

  if (list.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-gray-700 dark:text-gray-400">No holdings data available.</p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-700 dark:text-gray-400">
            <th className="text-left px-5 py-3">Token</th>
            <th className="text-right px-5 py-3">Tokens</th>
            <th className="text-right px-5 py-3">Value ({sinceDateLabel})</th>
            <th className="text-right px-5 py-3">Value Now</th>
            <th className="text-right px-5 py-3">Gain (USD)</th>
            <th className="text-right px-5 py-3">ROI (USD)</th>
            <th className="text-right px-5 py-3">ROI (ETH)</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.ticker} className="border-b border-gray-800/60 last:border-b-0">
              <td className="px-5 py-3">
                <div className={cn("font-medium", row.status === "exited" ? "text-gray-700 dark:text-gray-400" : "text-gray-900 dark:text-white")}>
                  ${row.ticker}
                </div>
                <StatusNote status={row.status} />
              </td>
              <td className="px-5 py-3 text-right font-mono text-gray-900 dark:text-white">
                {row.tokens != null ? row.tokens.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
              </td>
              <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-gray-400">
                {row.baselineValueUsd != null ? formatUSD(row.baselineValueUsd) : "—"}
              </td>
              <td className="px-5 py-3 text-right font-mono text-gray-900 dark:text-white">
                {row.valueNowUsd != null ? formatUSD(row.valueNowUsd) : "—"}
              </td>
              <td className={cn("px-5 py-3 text-right font-mono", row.gainUsd != null && row.gainUsd >= 0 ? "text-primary" : "text-danger")}>
                {row.gainUsd != null ? `${row.gainUsd >= 0 ? "+" : ""}${formatUSD(row.gainUsd)}` : "—"}
              </td>
              <td className="px-5 py-3 text-right"><ReturnCell value={row.roiUsdPct} /></td>
              <td className="px-5 py-3 text-right"><ReturnCell value={row.roiEthPct} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
