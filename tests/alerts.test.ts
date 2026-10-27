import { describe, expect, test } from "vitest";
import { detectAlerts } from "@/lib/predictions/alerts";
import type { Pitch, PricePoint, Quote } from "@/lib/predictions/types";

const DAY = 86_400_000;
const PITCHED = new Date(2026, 9, 14).getTime(); // Oct 14 2026, local

const pitch = (p: Partial<Pitch>): Pitch => ({
  id: "p", roundNumber: 6, sector: "economics", analyst: "A", marketTitle: "m", outcomeLabel: "o",
  venue: "kalshi", market: { source: "manual" }, side: "YES", entryPrice: 0.36, impliedPrice: 0.52,
  sellLimit: null, sellLimitBefore: null, stopLoss: null, exitBy: null, thesis: [], status: "open", votes: null,
  ...p,
});

const pts = (...prices: [number, number][]): PricePoint[] =>
  prices.map(([dayOffset, price]) => ({ time: PITCHED + dayOffset * DAY, price }));

const quote = (q: Partial<Quote> = {}): Quote => ({
  price: 0.3, resolved: false, resolvedPrice: null, closesAt: null, fetchedAt: "", ...q,
});

const NOW = PITCHED + 8 * DAY;

describe("detectAlerts", () => {
  test("flags the first touch of the stop after the pitch date", () => {
    const alerts = detectAlerts(pitch({ stopLoss: 0.25 }), pts([1, 0.3], [7, 0.25], [7.5, 0.22]), quote(), PITCHED, NOW);
    expect(alerts).toContainEqual(expect.objectContaining({ kind: "stop_loss", price: 0.25, time: PITCHED + 7 * DAY }));
  });

  test("ignores stop touches from before the pitch date", () => {
    const alerts = detectAlerts(pitch({ stopLoss: 0.25 }), pts([-2, 0.2], [1, 0.3]), quote(), PITCHED, NOW);
    expect(alerts.find((a) => a.kind === "stop_loss")).toBeUndefined();
  });

  test("flags a sell limit reached", () => {
    const alerts = detectAlerts(pitch({ sellLimit: 0.52 }), pts([1, 0.4], [3, 0.53]), quote(), PITCHED, NOW);
    expect(alerts).toContainEqual(expect.objectContaining({ kind: "sell_limit", price: 0.53 }));
  });

  test("only counts a sell limit inside its deadline", () => {
    const p = pitch({ sellLimit: 0.5, sellLimitBefore: "2026-10-16" });
    const alerts = detectAlerts(p, pts([1, 0.4], [5, 0.55]), quote(), PITCHED, NOW);
    expect(alerts.find((a) => a.kind === "sell_limit")).toBeUndefined();
  });

  test("warns when the exit date is within two days", () => {
    const p = pitch({ exitBy: "2026-10-23" });
    const alerts = detectAlerts(p, [], quote(), PITCHED, new Date(2026, 9, 22, 12).getTime());
    expect(alerts).toContainEqual(expect.objectContaining({ kind: "exit_due" }));
  });

  test("flags a passed exit date on an unresolved market", () => {
    const p = pitch({ exitBy: "2026-10-20" });
    const alerts = detectAlerts(p, [], quote(), PITCHED, NOW);
    expect(alerts).toContainEqual(expect.objectContaining({ kind: "exit_passed" }));
  });

  test("reports resolution and suppresses exit-date alerts once resolved", () => {
    const p = pitch({ exitBy: "2026-10-16" });
    const alerts = detectAlerts(p, [], quote({ resolved: true, resolvedPrice: 1 }), PITCHED, NOW);
    expect(alerts.map((a) => a.kind)).toEqual(["resolved_win"]);
  });

  test("returns nothing when no levels are touched", () => {
    const p = pitch({ sellLimit: 0.6, stopLoss: 0.2 });
    expect(detectAlerts(p, pts([1, 0.4], [2, 0.45]), quote(), PITCHED, NOW)).toEqual([]);
  });
});
