import { describe, expect, test } from "vitest";
import { buildLeaderboard } from "@/lib/predictions/leaderboard";
import type { Pitch, Quote, Trade, Round } from "@/lib/predictions/types";

const pitch = (p: Partial<Pitch>): Pitch => ({
  id: "p", roundNumber: 1, sector: "economics", analyst: "A", marketTitle: "m", outcomeLabel: "o",
  venue: "kalshi", market: { source: "manual" }, side: "YES", entryPrice: 0.5, impliedPrice: 0.7,
  sellLimit: null, sellLimitBefore: null, stopLoss: null, exitBy: null, thesis: [], status: "open", votes: null,
  ...p,
});

const quote = (price: number, resolved = false): Quote => ({
  price, resolved, resolvedPrice: resolved ? price : null, closesAt: null, fetchedAt: "",
});

const round = (number: number, selectedPitchId: string | null): Round => ({
  number, publishedAt: "2026-10-14", mediumUrl: null, summary: null, selectedPitchId,
});

describe("buildLeaderboard", () => {
  const pitches = [
    pitch({ id: "a1", roundNumber: 1, analyst: "Ana", sector: "economics", entryPrice: 0.36 }),
    pitch({ id: "a2", roundNumber: 2, analyst: "Ana", sector: "economics", entryPrice: 0.5, status: "closed" }),
    pitch({ id: "b1", roundNumber: 1, analyst: "Ben", sector: "ai_tech", entryPrice: 0.7, status: "closed" }),
  ];
  const quotes: Record<string, Quote | null> = {
    a1: quote(0.45),
    a2: quote(1, true),
    b1: quote(0, true),
  };
  const rounds = [round(1, "b1"), round(2, "a2")];

  test("scores every pitch, executed or paper, for accuracy", () => {
    const rows = buildLeaderboard(pitches, quotes, [], rounds, "analyst");
    const ana = rows.find((r) => r.key === "Ana")!;
    expect(ana.picks).toBe(2);
    expect(ana.closed).toBe(1);
    expect(ana.wins).toBe(1);
    expect(ana.hitRate).toBe(100);
    // avg of +25% (0.36→0.45, paper) and +100% (0.5→1, executed)
    expect(ana.avgReturn).toBeCloseTo(62.5, 1);

    const ben = rows.find((r) => r.key === "Ben")!;
    expect(ben.hitRate).toBe(0);
    expect(ben.avgReturn).toBeCloseTo(-100);
  });

  test("counts how many of each analyst's pitches won the club vote", () => {
    const rows = buildLeaderboard(pitches, quotes, [], rounds, "analyst");
    expect(rows.find((r) => r.key === "Ana")!.selected).toBe(1);
    expect(rows.find((r) => r.key === "Ben")!.selected).toBe(1);
  });

  test("sorts best average return first", () => {
    const rows = buildLeaderboard(pitches, quotes, [], rounds, "analyst");
    expect(rows.map((r) => r.key)).toEqual(["Ana", "Ben"]);
  });

  test("groups by sector", () => {
    const rows = buildLeaderboard(pitches, quotes, [], rounds, "sector");
    expect(rows.map((r) => r.key).sort()).toEqual(["ai_tech", "economics"]);
  });

  test("has null hit rate with no closed picks and skips unpriced picks in the average", () => {
    const rows = buildLeaderboard([pitch({ id: "x" }), pitch({ id: "y" })], { x: quote(0.6), y: null }, [], [], "analyst");
    expect(rows[0].hitRate).toBeNull();
    expect(rows[0].avgReturn).toBeCloseTo(20);
  });

  test("sums dollar P&L from trades", () => {
    const trades: Trade[] = [
      { id: "t1", pitchId: "a1", action: "buy", contracts: 100, price: 0.36, executedAt: "2026-10-13", reason: null },
    ];
    const rows = buildLeaderboard(pitches, quotes, trades, rounds, "analyst");
    expect(rows.find((r) => r.key === "Ana")!.pnlUsd).toBeCloseTo(9);
  });
});
