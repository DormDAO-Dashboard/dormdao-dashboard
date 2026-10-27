import type { Pitch, PricePoint, Quote } from "@/lib/predictions/types";

export type AlertKind = "sell_limit" | "stop_loss" | "exit_due" | "exit_passed" | "resolved_win" | "resolved_loss";

export interface PitchAlert {
  kind: AlertKind;
  time: number | null;  // when it happened (ms); null for date-based warnings
  price: number | null; // price at the touch, for level alerts
}

const DAY_MS = 86_400_000;
const EXIT_WARNING_DAYS = 2;

// End of a calendar date ("2026-10-27" → start of Oct 28, local), so a
// deadline counts the whole day.
function endOfDay(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d + 1).getTime();
}

function firstTouch(points: PricePoint[], hit: (price: number) => boolean): PricePoint | null {
  return points.find((p) => hit(p.price)) ?? null;
}

// Alerts for one pitch from its price history (chosen-side prices). Only
// points on/after the pitch date count — earlier prices predate the trade.
export function detectAlerts(
  pitch: Pitch,
  history: PricePoint[],
  quote: Quote | null,
  pitchedAt: number,
  now: number,
): PitchAlert[] {
  const live = history.filter((p) => p.time >= pitchedAt);
  const alerts: PitchAlert[] = [];

  if (pitch.sellLimit !== null) {
    const limit = pitch.sellLimit;
    const deadline = pitch.sellLimitBefore ? endOfDay(pitch.sellLimitBefore) : Infinity;
    const touch = firstTouch(live.filter((p) => p.time < deadline), (price) => price >= limit);
    if (touch) alerts.push({ kind: "sell_limit", time: touch.time, price: touch.price });
  }

  if (pitch.stopLoss !== null) {
    const stop = pitch.stopLoss;
    const touch = firstTouch(live, (price) => price <= stop);
    if (touch) alerts.push({ kind: "stop_loss", time: touch.time, price: touch.price });
  }

  alerts.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

  if (quote?.resolved && quote.resolvedPrice !== null) {
    alerts.push({ kind: quote.resolvedPrice >= 1 ? "resolved_win" : "resolved_loss", time: null, price: quote.resolvedPrice });
    return alerts;
  }

  if (pitch.exitBy) {
    const deadline = endOfDay(pitch.exitBy);
    if (now >= deadline) alerts.push({ kind: "exit_passed", time: null, price: null });
    else if (deadline - now <= EXIT_WARNING_DAYS * DAY_MS) alerts.push({ kind: "exit_due", time: null, price: null });
  }

  return alerts;
}
