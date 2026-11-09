import { requirePredictionsAccess } from "@/lib/predictions/access";

// Predictions Leaderboard tab — one table, styled like the main
// /leaderboard's Current Season panel. Deliberately empty for now: it'll
// rank schools once more than one is running prediction markets.
const COLUMNS: Array<{ label: string; className: string }> = [
  { label: "#",          className: "text-left w-[8%]" },
  { label: "School",     className: "text-left" },
  { label: "Pitches",    className: "text-right w-[13%]" },
  { label: "Hit Rate",   className: "text-right w-[13%]" },
  { label: "Avg Return", className: "text-right w-[15%] whitespace-normal leading-tight" },
  { label: "Fund P&L",   className: "text-right w-[15%]" },
];

export default async function PredictionsLeaderboardPage() {
  // Gate in the page itself, not only the layout: Next renders layouts and
  // pages in parallel, so a layout-only check still streams page data.
  await requirePredictionsAccess();

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <h1 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">Leaderboard</h1>
        <p className="text-[11px] text-gray-700 dark:text-gray-400">School prediction market performance rankings.</p>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-yellow-500/50 bg-yellow-500/[0.02]">
        <div className="shrink-0 px-3 py-2 border-b border-yellow-500/30 bg-yellow-500/[0.04]">
          <div className="text-xs font-semibold text-gray-900 dark:text-white">Prediction Markets</div>
          <div className="text-[10px] text-gray-700 dark:text-gray-400 mt-0.5">All schools</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs min-w-[480px]">
            <thead className="bg-white/95 dark:bg-gray-900/95">
              <tr className="border-b border-gray-200 dark:border-gray-800">
                {COLUMNS.map((c) => (
                  <th key={c.label} className={`px-3 py-2 whitespace-nowrap text-[10px] uppercase tracking-wide text-gray-700 dark:text-gray-400 ${c.className}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={COLUMNS.length} className="py-16 text-center text-gray-700 dark:text-gray-400 text-xs px-4">
                  No rankings yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
