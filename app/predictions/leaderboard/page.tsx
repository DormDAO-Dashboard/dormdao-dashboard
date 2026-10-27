import { requireAdmin } from "@/lib/admin-guard";
import { loadAllWithQuotes } from "@/lib/predictions/load";
import { buildLeaderboard, type LeaderboardRow } from "@/lib/predictions/leaderboard";
import { signedPct, toneClass, usd } from "@/lib/predictions/format";
import { SECTOR_LABEL, type Sector } from "@/lib/predictions/types";

export const revalidate = 60;

function Table({ title, rows, label }: { title: string; rows: LeaderboardRow[]; label: (key: string) => string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden">
      <h2 className="px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th className="text-left px-5 py-2">#</th>
              <th className="text-left px-5 py-2">Name</th>
              <th className="text-right px-5 py-2">Pitches</th>
              <th className="text-right px-5 py-2">Selected</th>
              <th className="text-right px-5 py-2">Hit rate</th>
              <th className="text-right px-5 py-2">Avg return</th>
              <th className="text-right px-5 py-2">Fund P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className="border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                <td className="px-5 py-3 font-mono text-gray-500 dark:text-gray-400">{i + 1}</td>
                <td className="px-5 py-3 text-gray-900 dark:text-white">{label(r.key)}</td>
                <td className="px-5 py-3 text-right font-mono">{r.picks}</td>
                <td className="px-5 py-3 text-right font-mono">{r.selected}</td>
                <td className="px-5 py-3 text-right font-mono">
                  {r.hitRate === null ? "—" : `${Math.round(r.hitRate)}%`}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({r.wins}/{r.closed})</span>
                </td>
                <td className={`px-5 py-3 text-right font-mono ${toneClass(r.avgReturn)}`}>{signedPct(r.avgReturn)}</td>
                <td className={`px-5 py-3 text-right font-mono ${toneClass(r.pnlUsd)}`}>{usd(r.pnlUsd, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function LeaderboardPage() {
  // Gate in the page itself, not only the layout: Next renders layouts and
  // pages in parallel, so a layout-only check still streams page data.
  await requireAdmin();
  const { rounds, pitches, trades, quotes } = await loadAllWithQuotes();

  if (pitches.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No pitches yet.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Leaderboard</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Accuracy covers every pitch, executed or not. Hit rate counts closed pitches that finished above entry; avg return is entry → current (or resolved) price. Selected = pitches that won the club vote. Fund P&amp;L comes only from executed trades.
      </p>
      <Table title="Sectors" rows={buildLeaderboard(pitches, quotes, trades, rounds, "sector")} label={(k) => SECTOR_LABEL[k as Sector] ?? k} />
    </div>
  );
}
