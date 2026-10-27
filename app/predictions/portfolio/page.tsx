import { requireAdmin } from "@/lib/admin-guard";
import Link from "next/link";
import { loadAllWithQuotes } from "@/lib/predictions/load";
import { markPrice, returnPct, summarizePosition, withSettlement } from "@/lib/predictions/math";
import { cents, signedPct, toneClass, usd } from "@/lib/predictions/format";
import { SectorBadge, SideBadge } from "@/components/predictions/Badges";
import { Stat } from "@/components/predictions/Stat";
import { STAKE_USD } from "@/lib/predictions/stake";

export const revalidate = 60;

const card = "rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30";

export default async function PortfolioPage() {
  // Gate in the page itself, not only the layout: Next renders layouts and
  // pages in parallel, so a layout-only check still streams page data.
  await requireAdmin();
  const { rounds, pitches, trades, quotes } = await loadAllWithQuotes();

  // The fund's actual pick each round (the vote winner), newest first.
  const executed = rounds.flatMap((r) => {
    const pitch = pitches.find((p) => p.id === r.selectedPitchId);
    if (!pitch) return [];
    const mark = markPrice(quotes[pitch.id] ?? null);
    return [{ round: r, pitch, mark, ret: mark === null ? null : returnPct(pitch.entryPrice, mark), resolved: Boolean(quotes[pitch.id]?.resolved) }];
  });
  const resolvedPicks = executed.filter((e) => e.resolved);
  const pickWins = resolvedPicks.filter((e) => (e.ret ?? 0) > 0).length;
  const pricedReturns = executed.flatMap((e) => (e.ret === null ? [] : [e.ret]));
  const avgPickReturn = pricedReturns.length > 0 ? pricedReturns.reduce((a, b) => a + b, 0) / pricedReturns.length : null;

  const positions = pitches
    .map((p) => {
      const mine = withSettlement(trades.filter((t) => t.pitchId === p.id), quotes[p.id] ?? null);
      const mark = markPrice(quotes[p.id] ?? null);
      return { pitch: p, mark, summary: summarizePosition(mine, mark), tradeCount: mine.length };
    })
    .filter((row) => row.tradeCount > 0);

  const totals = positions.reduce(
    (acc, { summary: s }) => ({
      invested: acc.invested + s.costBasis,
      value: acc.value + s.marketValue,
      realized: acc.realized + s.realizedPnl,
      unrealized: acc.unrealized + s.unrealizedPnl,
    }),
    { invested: 0, value: 0, realized: 0, unrealized: 0 },
  );
  const open = positions.filter((row) => row.summary.contractsOpen > 0);
  const closed = positions.filter((row) => row.summary.contractsOpen === 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Fund Portfolio</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Dollar figures assume ${STAKE_USD} into each executed pick at its pitched entry price, held to resolution, until real fills are recorded.
      </p>

      <section className={`${card} mb-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-4 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Executed Picks</h2>
          <div className="flex gap-6">
            <Stat label="Record" value={`${pickWins}–${resolvedPicks.length - pickWins}`} sub={`${executed.length - resolvedPicks.length} open`} />
            <Stat label="Avg return" value={signedPct(avgPickReturn)} subClass={toneClass(avgPickReturn)} />
          </div>
        </div>
        {executed.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">No vote winners recorded yet.</p>
        ) : (
          <ul>
            {executed.map(({ round, pitch, mark, ret, resolved }) => (
              <li key={pitch.id} className="border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                <Link href={`/predictions/pitches/${pitch.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <span className="font-mono text-sm text-gray-500 dark:text-gray-400 w-10">#{round.number}</span>
                  <SectorBadge sector={pitch.sector} />
                  <span className="flex-1 min-w-[12rem] text-gray-900 dark:text-white">
                    {pitch.marketTitle}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{pitch.analyst} · {pitch.side} {pitch.outcomeLabel}</span>
                  </span>
                  <span className="font-mono text-sm">{cents(pitch.entryPrice)} → {cents(mark)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-14">{resolved ? "resolved" : "open"}</span>
                  <span className={`font-mono text-sm w-14 text-right ${toneClass(ret)}`}>{signedPct(ret)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={`${card} p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6`}>
        <Stat large label="Open cost basis" value={usd(totals.invested)} />
        <Stat large label="Open market value" value={usd(totals.value)} />
        <Stat large label="Unrealized P&L" value={usd(totals.unrealized, true)} />
        <Stat large label="Realized P&L" value={usd(totals.realized, true)} />
      </div>

      {positions.length === 0 ? (
        <div className={`${card} p-8 text-center text-gray-500 dark:text-gray-400`}>
          No fills recorded yet. Once the database is connected, enter each buy/sell on its pitch and positions and P&amp;L show up here.
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3">Market</th>
                <th className="text-right px-5 py-3">Contracts</th>
                <th className="text-right px-5 py-3">Avg entry</th>
                <th className="text-right px-5 py-3">Mark</th>
                <th className="text-right px-5 py-3">Cost</th>
                <th className="text-right px-5 py-3">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {[...open, ...closed].map(({ pitch, mark, summary }) => (
                <tr key={pitch.id} className="border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/predictions/pitches/${pitch.id}`} className="text-gray-900 dark:text-white hover:text-primary transition-colors">
                      {pitch.marketTitle}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <SectorBadge sector={pitch.sector} />
                      <SideBadge side={pitch.side} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{pitch.outcomeLabel}</span>
                      {summary.contractsOpen === 0 && <span className="text-xs text-gray-500 dark:text-gray-400">· closed</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{summary.contractsOpen.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono">{cents(summary.avgEntry)}</td>
                  <td className="px-5 py-3 text-right font-mono">{cents(mark)}</td>
                  <td className="px-5 py-3 text-right font-mono">{usd(summary.costBasis)}</td>
                  <td className={`px-5 py-3 text-right font-mono ${toneClass(summary.totalPnl)}`}>{usd(summary.totalPnl, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
