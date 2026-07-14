"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { TOKEN_META } from "@/lib/tokens";
import { formatUSD } from "@/lib/utils";
import { TrendingDown } from "lucide-react";

interface ChangeRow {
  id: string;
  school_name: string;
  change_type: "decrease" | "sell";
  token_ticker: string;
  old_quantity: number | null;
  new_quantity: number | null;
  eth_value: number | null;
  detected_at: string | null;
}

function schoolSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/\./g, "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatQty(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// pnlBySchool[schoolName][ticker] = { gainUsd, roiUsdPct, roiEthPct }
type PnlEntry = { gainUsd: number; roiUsdPct: number; roiEthPct: number };
type PnlMap = Record<string, Record<string, PnlEntry>>;

export function TrimsAndSells() {
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [pnlMap, setPnlMap] = useState<PnlMap>({});
  const [loading, setLoading] = useState(true);
  const [schoolFilter, setSchoolFilter] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [changesRes, sheetsRes] = await Promise.all([
          fetch("/api/changes?type=trim").then(r => r.json()),
          fetch("/api/sheets").then(r => r.json()),
        ]);
        setChanges(changesRes.changes ?? []);

        // Build P&L lookup from both active and exited holdings
        const map: PnlMap = {};
        for (const school of sheetsRes.schools ?? []) {
          const byTicker: Record<string, PnlEntry> = {};
          for (const h of school.holdings ?? []) {
            if (h.gainUsd !== undefined) {
              byTicker[h.ticker] = { gainUsd: h.gainUsd, roiUsdPct: h.roiUsdPct ?? 0, roiEthPct: h.roiEthPct ?? 0 } as PnlEntry;
            }
          }
          for (const h of school.exitedHoldings ?? []) {
            byTicker[h.ticker] = { gainUsd: h.gainUsd, roiUsdPct: h.roiUsdPct, roiEthPct: h.roiEthPct } as PnlEntry;
          }
          map[school.name] = byTicker;
        }
        setPnlMap(map);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const uniqueSchools = [...new Set(changes.map(c => c.school_name))].sort();
  const filtered = schoolFilter ? changes.filter(c => c.school_name === schoolFilter) : changes;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden mb-8">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-danger" />
          <h2 className="text-sm font-semibold text-gray-300">Position Trims Detected</h2>
          {!loading && (
            <span className="text-xs text-gray-600 ml-1">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {uniqueSchools.length > 0 && (
          <select
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Schools</option>
            {uniqueSchools.map(s => <option key={s} value={s}>{schoolDisplayName(s)}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          No trims detected yet — checked hourly via snapshots.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500">
                <th className="text-left px-5 py-3">School</th>
                <th className="text-left px-5 py-3">Token</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-right px-5 py-3">Before</th>
                <th className="text-right px-5 py-3">After</th>
                <th className="text-right px-5 py-3">Tokens Sold</th>
                <th className="text-right px-5 py-3">P&amp;L (USD)</th>
                <th className="text-right px-5 py-3">ROI (USD)</th>
                <th className="text-right px-5 py-3">ROI (ETH)</th>
                <th className="text-right px-5 py-3">Detected</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const tokenMeta = TOKEN_META[c.token_ticker];
                const sold = c.old_quantity !== null && c.new_quantity !== null
                  ? c.old_quantity - c.new_quantity
                  : c.old_quantity;
                const isFull = c.change_type === "sell";
                const pnl = pnlMap[c.school_name]?.[c.token_ticker] ?? null;

                return (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/schools/${schoolSlug(c.school_name)}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <SchoolLogo name={c.school_name} size={20} />
                        <span className="text-gray-300 text-xs">{schoolDisplayName(c.school_name)}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/tokens/${c.token_ticker.toLowerCase()}`}
                        className="font-mono font-semibold text-white hover:text-primary transition-colors"
                      >
                        ${tokenMeta?.displayTicker ?? c.token_ticker}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        isFull
                          ? "bg-danger/20 text-danger border border-danger/30"
                          : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      }`}>
                        {isFull ? "Full Exit" : "Trimmed"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-400 text-xs">
                      {formatQty(c.old_quantity)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-400 text-xs">
                      {isFull ? "0" : formatQty(c.new_quantity)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-danger text-xs">
                      -{formatQty(sold)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {pnl !== null ? (
                        <span className={pnl.gainUsd >= 0 ? "text-primary" : "text-danger"}>
                          {pnl.gainUsd >= 0 ? "+" : ""}{formatUSD(pnl.gainUsd)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {pnl !== null && pnl.roiUsdPct !== 0 ? (
                        <span className={pnl.roiUsdPct >= 0 ? "text-primary" : "text-danger"}>
                          {pnl.roiUsdPct >= 0 ? "+" : ""}{pnl.roiUsdPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {pnl !== null && pnl.roiEthPct !== 0 ? (
                        <span className={pnl.roiEthPct >= 0 ? "text-primary" : "text-danger"}>
                          {pnl.roiEthPct >= 0 ? "+" : ""}{pnl.roiEthPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                      {c.detected_at ? formatDate(c.detected_at) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
