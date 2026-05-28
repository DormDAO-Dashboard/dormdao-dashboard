"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SchoolLogo } from "@/components/SchoolLogo";
import { TOKEN_META } from "@/lib/tokens";
import { TrendingDown } from "lucide-react";

interface ChangeRow {
  id: string;
  school_name: string;
  change_type: "decrease" | "sell";
  token_ticker: string;
  old_quantity: number | null;
  new_quantity: number | null;
  eth_value: number | null;
  created_at: string;
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

export function TrimsAndSells() {
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolFilter, setSchoolFilter] = useState("");

  useEffect(() => {
    fetch("/api/changes?type=trim")
      .then(r => r.json())
      .then(d => setChanges(d.changes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uniqueSchools = [...new Set(changes.map(c => c.school_name))].sort();

  const filtered = schoolFilter
    ? changes.filter(c => c.school_name === schoolFilter)
    : changes;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden mb-8">
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
            {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          No trims detected yet — checked daily via snapshots.
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

                return (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/schools/${schoolSlug(c.school_name)}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <SchoolLogo name={c.school_name} size={20} />
                        <span className="text-gray-300 text-xs">{c.school_name}</span>
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
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                      {formatDate(c.created_at)}
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
