import { requireAdmin } from "@/lib/admin-guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRepo } from "@/lib/predictions/repo";
import { loadPitches, pitchedAt } from "@/lib/predictions/load";
import { markPrice, returnPct, summarizePosition, withSettlement } from "@/lib/predictions/math";
import { cents, shortDate, signedPct, toneClass, usd } from "@/lib/predictions/format";
import { SECTOR_LABEL, type Trade } from "@/lib/predictions/types";
import { RoleBadge, SectorBadge, SideBadge, VenueLabel } from "@/components/predictions/Badges";
import { PitchChartPanel } from "@/components/predictions/PitchChartPanel";
import { Stat } from "@/components/predictions/Stat";
import { pitchRole } from "@/lib/predictions/selection";
import { AlertList } from "@/components/predictions/Alerts";

export const revalidate = 60;

const card = "rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5";

function TradesTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No fills recorded for this pitch yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
            <th className="text-left py-2">Date</th>
            <th className="text-left py-2">Action</th>
            <th className="text-right py-2">Contracts</th>
            <th className="text-right py-2">Price</th>
            <th className="text-right py-2">Notional</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {trades.map((t) => (
            <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800/60 last:border-0">
              <td className="py-2">{shortDate(t.executedAt)}</td>
              <td className="py-2 capitalize font-sans">{t.action}{t.reason ? ` · ${t.reason.replace("_", " ")}` : ""}</td>
              <td className="py-2 text-right">{t.contracts.toLocaleString()}</td>
              <td className="py-2 text-right">{cents(t.price)}</td>
              <td className="py-2 text-right">{usd(t.contracts * t.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PitchPage({ params }: { params: Promise<{ id: string }> }) {
  // Gate in the page itself, not only the layout: Next renders layouts and
  // pages in parallel, so a layout-only check still streams page data.
  await requireAdmin();
  const { id } = await params;
  const repo = getRepo();
  const [pitch, rounds, trades] = await Promise.all([repo.getPitch(id), repo.listRounds(), repo.listTrades(id)]);
  if (!pitch) notFound();

  const { quotes, histories, alerts } = await loadPitches([pitch], rounds);
  const quote = quotes[pitch.id];
  const mark = markPrice(quote);
  const fills = withSettlement(trades, quote);
  const position = summarizePosition(fills, mark);
  const round = rounds.find((w) => w.number === pitch.roundNumber);

  return (
    <div className="max-w-4xl">
      <Link href="/predictions" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className={`${card} mb-6`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <SectorBadge sector={pitch.sector} />
          <RoleBadge role={pitchRole(pitch, round)} closed={Boolean(quote?.resolved) || pitch.status === "closed"} />
          <span className="text-xs text-gray-500 dark:text-gray-400">Pitch #{pitch.roundNumber}</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {pitch.analyst} · {SECTOR_LABEL[pitch.sector]} Team · <VenueLabel venue={pitch.venue} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pitch.marketTitle}</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Investment:</span>
          <SideBadge side={pitch.side} />
          <span className="text-gray-900 dark:text-white">on {pitch.outcomeLabel}</span>
        </div>

        {(alerts[pitch.id] ?? []).length > 0 && <div className="mt-4"><AlertList alerts={alerts[pitch.id]} /></div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
          <Stat label="Price (entry)" value={cents(pitch.entryPrice)} />
          <Stat label="Implied" value={cents(pitch.impliedPrice)} sub={signedPct(returnPct(pitch.entryPrice, pitch.impliedPrice))} />
          <Stat
            label={pitch.sellLimitBefore ? `Sell limit pre-${shortDate(pitch.sellLimitBefore)}` : "Sell limit"}
            value={cents(pitch.sellLimit)}
            sub={pitch.sellLimit !== null ? signedPct(returnPct(pitch.entryPrice, pitch.sellLimit)) : undefined}
          />
          <Stat
            label="Stop"
            value={cents(pitch.stopLoss)}
            sub={pitch.stopLoss !== null ? signedPct(returnPct(pitch.entryPrice, pitch.stopLoss)) : undefined}
            subClass="text-danger"
          />
        </div>

        <PitchChartPanel
          pitchId={pitch.id}
          initialPoints={histories[pitch.id] ?? []}
          levels={{ entry: pitch.entryPrice, implied: pitch.impliedPrice, sellLimit: pitch.sellLimit, stopLoss: pitch.stopLoss }}
          livePrice={mark}
          liveLabel={quote?.resolved ? "Resolved" : "Now"}
          pitchedAt={pitchedAt(round)}
        />
        {!quote && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Live price unavailable right now.</p>}
        {pitch.exitBy && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Mandatory exit by {shortDate(pitch.exitBy)}</p>}
      </div>

      <div className={`${card} mb-6`}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Thesis</h2>
        <div className="space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed">
          {pitch.thesis.map((para, i) => <p key={i}>{para}</p>)}
        </div>
        {round?.mediumUrl && (
          <a href={round.mediumUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-sm text-primary hover:underline">
            Full write-up on Medium →
          </a>
        )}
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Fund Position</h2>
          {pitchRole(pitch, round) === "paper" && <span className="text-xs text-gray-500 dark:text-gray-400">Not selected by the club vote — tracked as a paper pick.</span>}
          {fills.length > 0 && (
            <div className="flex gap-6">
              <Stat label="Open contracts" value={position.contractsOpen.toLocaleString()} />
              <Stat label="Cost basis" value={usd(position.costBasis)} />
              <Stat label="P&L" value={usd(position.totalPnl, true)} />
            </div>
          )}
        </div>
        <TradesTable trades={fills} />
      </div>
    </div>
  );
}
