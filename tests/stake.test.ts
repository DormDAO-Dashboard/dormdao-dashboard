import { describe, expect, test } from "vitest";
import { stakeTrades, STAKE_USD } from "@/lib/predictions/stake";
import type { Pitch, Round } from "@/lib/predictions/types";

const pitch = (p: Partial<Pitch>): Pitch => ({
  id: "p", roundNumber: 5, sector: "economics", analyst: "A", marketTitle: "m", outcomeLabel: "o",
  venue: "kalshi", market: { source: "manual" }, side: "NO", entryPrice: 0.53, impliedPrice: 1,
  sellLimit: null, sellLimitBefore: null, stopLoss: null, exitBy: null, thesis: [], status: "closed", votes: null,
  ...p,
});

const round = (number: number, selectedPitchId: string | null): Round => ({
  number, publishedAt: "2026-10-07", mediumUrl: null, summary: null, selectedPitchId,
});

describe("stakeTrades", () => {
  test("buys $50 of the executed pitch at its entry price", () => {
    const trades = stakeTrades([pitch({ id: "a" }), pitch({ id: "b" })], [round(5, "a")], []);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({ pitchId: "a", action: "buy", price: 0.53, executedAt: "2026-10-07" });
    expect(trades[0].contracts * trades[0].price).toBeCloseTo(STAKE_USD);
  });

  test("skips rounds still voting", () => {
    expect(stakeTrades([pitch({ id: "a" })], [round(5, null)], [])).toEqual([]);
  });

  test("defers to real fills when a pitch already has them", () => {
    const real = [{ id: "t", pitchId: "a", action: "buy" as const, contracts: 10, price: 0.5, executedAt: "2026-10-08", reason: null }];
    expect(stakeTrades([pitch({ id: "a" })], [round(5, "a")], real)).toEqual([]);
  });
});
