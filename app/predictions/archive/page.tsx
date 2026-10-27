import { requireAdmin } from "@/lib/admin-guard";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { loadAllWithQuotes } from "@/lib/predictions/load";
import { markPrice, returnPct } from "@/lib/predictions/math";
import { cents, shortDate, signedPct, toneClass } from "@/lib/predictions/format";
import { RoleBadge, SectorBadge, SideBadge } from "@/components/predictions/Badges";
import { pitchRole } from "@/lib/predictions/selection";

export const revalidate = 60;

export default async function ArchivePage() {
  // Gate in the page itself, not only the layout: Next renders layouts and
  // pages in parallel, so a layout-only check still streams page data.
  await requireAdmin();
  const { rounds, pitches, quotes } = await loadAllWithQuotes();

  if (rounds.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No rounds published yet.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Archive</h1>
      <div className="space-y-6">
        {rounds.map((round) => {
          const roundPitches = pitches.filter((p) => p.roundNumber === round.number);
          return (
            <section key={round.number} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30">
              <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Pitch #{round.number}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{shortDate(round.publishedAt)}</span>
                </div>
                {round.mediumUrl && (
                  <a href={round.mediumUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">
                    Medium <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </header>
              <ul>
                {roundPitches.map((p) => {
                  const mark = markPrice(quotes[p.id] ?? null);
                  const ret = mark === null ? null : returnPct(p.entryPrice, mark);
                  return (
                    <li key={p.id} className="border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                      <Link href={`/predictions/pitches/${p.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <SectorBadge sector={p.sector} />
                        <span className="text-gray-900 dark:text-white flex-1 min-w-[12rem]">
                          {p.marketTitle}
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{p.analyst}</span>
                        </span>
                        <RoleBadge role={pitchRole(p, round)} closed={false} />
                        <SideBadge side={p.side} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{p.outcomeLabel}</span>
                        <span className="font-mono text-sm w-24 text-right">{cents(p.entryPrice)} → {cents(mark)}</span>
                        <span className={`font-mono text-sm w-14 text-right ${toneClass(ret)}`}>{signedPct(ret)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
