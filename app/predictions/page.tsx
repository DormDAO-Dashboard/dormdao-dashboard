import { requireAdmin } from "@/lib/admin-guard";
import { ExternalLink } from "lucide-react";
import { loadRound } from "@/lib/predictions/load";
import { shortDate } from "@/lib/predictions/format";
import { PitchCard } from "@/components/predictions/PitchCard";
import { SECTOR_ORDER } from "@/lib/predictions/types";
import { pitchRole } from "@/lib/predictions/selection";

export const revalidate = 60;

export default async function LatestRoundPage() {
  // Gate in the page itself, not only the layout: Next renders layouts and
  // pages in parallel, so a layout-only check still streams page data.
  await requireAdmin();
  const { round, pitches, quotes, histories, alerts } = await loadRound();

  if (!round) {
    return <p className="text-gray-500 dark:text-gray-400">No rounds published yet.</p>;
  }

  const ordered = [...pitches].sort((a, b) => SECTOR_ORDER.indexOf(a.sector) - SECTOR_ORDER.indexOf(b.sector));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Pitch #{round.number} · {shortDate(round.publishedAt)}</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {round.selectedPitchId ? "This Round\u2019s Pitches" : "Voting Open"}
          </h1>
          {round.summary && <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">{round.summary}</p>}
        </div>
        {round.mediumUrl && (
          <a
            href={round.mediumUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-primary/50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Read on Medium <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {ordered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No pitches for this round yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ordered.map((p) => (
            <PitchCard key={p.id} pitch={p} quote={quotes[p.id]} history={histories[p.id]} role={pitchRole(p, round)} alerts={alerts[p.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
