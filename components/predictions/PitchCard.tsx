import Link from "next/link";
import type { Pitch, PitchRole, PricePoint, Quote } from "@/lib/predictions/types";
import { markPrice, returnPct } from "@/lib/predictions/math";
import { cents, cn, shortDate, signedPct, toneClass } from "@/lib/predictions/format";
import { RoleBadge, SectorBadge, SideBadge, VenueLabel } from "@/components/predictions/Badges";
import { OddsChart } from "@/components/predictions/OddsChart";
import { Stat } from "@/components/predictions/Stat";
import { AlertChips } from "@/components/predictions/Alerts";
import type { PitchAlert } from "@/lib/predictions/alerts";

interface PitchCardProps {
  pitch: Pitch;
  quote: Quote | null;
  history: PricePoint[];
  role: PitchRole;
  alerts: PitchAlert[];
}

export function PitchCard({ pitch, quote, history, role, alerts }: PitchCardProps) {
  const mark = markPrice(quote);
  const pnl = mark === null ? null : returnPct(pitch.entryPrice, mark);
  const target = pitch.sellLimit ?? pitch.impliedPrice;

  return (
    <Link
      href={`/predictions/pitches/${pitch.id}`}
      className={cn(
        "group flex flex-col rounded-lg border bg-white dark:bg-gray-900/30 p-5 hover:border-primary/50 transition-colors",
        role === "executed" ? "border-primary/60 ring-1 ring-primary/30" : "border-gray-200 dark:border-gray-800",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <SectorBadge sector={pitch.sector} />
        <RoleBadge role={role} closed={Boolean(quote?.resolved) || pitch.status === "closed"} />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        {pitch.analyst} · <VenueLabel venue={pitch.venue} />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors leading-snug">
        {pitch.marketTitle}
      </h3>
      <div className="flex items-center gap-2 mt-2 mb-4">
        <SideBadge side={pitch.side} />
        <span className="text-sm text-gray-700 dark:text-gray-300">{pitch.outcomeLabel}</span>
      </div>

      {alerts.length > 0 && <div className="-mt-2 mb-4"><AlertChips alerts={alerts} /></div>}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Entry" value={cents(pitch.entryPrice)} />
        <Stat
          label={quote?.resolved ? "Resolved" : "Now"}
          value={cents(mark)}
          sub={signedPct(pnl)}
          subClass={toneClass(pnl)}
        />
        <Stat
          label={pitch.sellLimit !== null ? "Sell limit" : "Implied"}
          value={cents(target)}
          sub={signedPct(returnPct(pitch.entryPrice, target))}
        />
      </div>

      <div className="mt-auto">
        <OddsChart
          points={history}
          height={90}
          compact
          levels={{ entry: pitch.entryPrice, implied: pitch.impliedPrice, sellLimit: pitch.sellLimit, stopLoss: pitch.stopLoss }}
        />
        {pitch.exitBy && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Exit by {shortDate(pitch.exitBy)}</div>
        )}
      </div>
    </Link>
  );
}
