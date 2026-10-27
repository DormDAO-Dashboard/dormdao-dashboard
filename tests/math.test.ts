import { describe, expect, test } from "vitest";
import { returnPct, sidePrice, summarizePosition, pickOutcome, markPrice, withSettlement } from "@/lib/predictions/math";
import type { Trade, Quote } from "@/lib/predictions/types";

const trade = (t: Partial<Trade>): Trade => ({
  id: "t", pitchId: "p", action: "buy", contracts: 100, price: 0.36,
  executedAt: "2026-10-13T00:00:00Z", reason: null, ...t,
});

const quote = (q: Partial<Quote>): Quote => ({
  price: 0.5, resolved: false, resolvedPrice: null, closesAt: null, fetchedAt: "", ...q,
});

describe("returnPct", () => {
  test("matches the article's implied returns", () => {
    expect(returnPct(0.7, 1)).toBeCloseTo(42.86, 1);     // BTC: 70% → 100% ≈ 43%
    expect(returnPct(0.36, 0.52)).toBeCloseTo(44.44, 1); // GDP sell limit ≈ 44%
    expect(returnPct(0.35, 0.5)).toBeCloseTo(42.86, 1);  // Brazil limit ≈ 43%
  });

  test("returns a loss for a stop below entry", () => {
    expect(returnPct(0.36, 0.25)).toBeCloseTo(-30.56, 1); // article: ~31% loss
  });

  test("returns null when entry is zero", () => {
    expect(returnPct(0, 0.5)).toBeNull();
  });
});

describe("sidePrice", () => {
  test("passes YES through and flips NO", () => {
    expect(sidePrice(0.28, "YES")).toBe(0.28);
    expect(sidePrice(0.28, "NO")).toBeCloseTo(0.72);
  });
});

describe("markPrice", () => {
  test("uses resolution price once resolved", () => {
    expect(markPrice(quote({ price: 0.99, resolved: true, resolvedPrice: 0 }))).toBe(0);
  });

  test("uses live price otherwise", () => {
    expect(markPrice(quote({ price: 0.4 }))).toBe(0.4);
  });
});

describe("summarizePosition", () => {
  test("computes unrealized P&L for an open position", () => {
    const s = summarizePosition([trade({ contracts: 100, price: 0.36 })], 0.5);
    expect(s.contractsOpen).toBe(100);
    expect(s.costBasis).toBeCloseTo(36);
    expect(s.avgEntry).toBeCloseTo(0.36);
    expect(s.unrealizedPnl).toBeCloseTo(14);
    expect(s.realizedPnl).toBe(0);
  });

  test("realizes P&L on partial and full sells at average cost", () => {
    const trades = [
      trade({ id: "a", contracts: 100, price: 0.3 }),
      trade({ id: "b", contracts: 100, price: 0.4 }),
      trade({ id: "c", action: "sell", contracts: 150, price: 0.5 }),
    ];
    const s = summarizePosition(trades, 0.6);
    expect(s.avgEntry).toBeCloseTo(0.35);
    expect(s.realizedPnl).toBeCloseTo(150 * (0.5 - 0.35));
    expect(s.contractsOpen).toBe(50);
    expect(s.unrealizedPnl).toBeCloseTo(50 * (0.6 - 0.35));
  });

  test("treats resolve like a sell at the payout", () => {
    const s = summarizePosition(
      [trade({ contracts: 100, price: 0.7 }), trade({ id: "r", action: "resolve", contracts: 100, price: 0 })],
      null,
    );
    expect(s.contractsOpen).toBe(0);
    expect(s.realizedPnl).toBeCloseTo(-70);
    expect(s.unrealizedPnl).toBe(0);
  });

  test("ignores sells beyond open contracts instead of going negative", () => {
    const s = summarizePosition(
      [trade({ contracts: 10, price: 0.5 }), trade({ id: "s", action: "sell", contracts: 20, price: 0.6 })],
      null,
    );
    expect(s.contractsOpen).toBe(0);
    expect(s.realizedPnl).toBeCloseTo(1);
  });

  test("returns zeros with no trades", () => {
    const s = summarizePosition([], 0.5);
    expect(s).toMatchObject({ contractsOpen: 0, costBasis: 0, realizedPnl: 0, unrealizedPnl: 0, avgEntry: null });
  });
});

describe("withSettlement", () => {
  test("adds a resolve fill for open contracts once the market resolves", () => {
    const trades = [trade({ contracts: 100, price: 0.7 })];
    const settled = withSettlement(trades, quote({ resolved: true, resolvedPrice: 0 }));
    const s = summarizePosition(settled, 0);
    expect(s.contractsOpen).toBe(0);
    expect(s.realizedPnl).toBeCloseTo(-70);
    expect(s.unrealizedPnl).toBe(0);
  });

  test("leaves trades alone while the market is open or already fully exited", () => {
    const open = [trade({})];
    expect(withSettlement(open, quote({}))).toEqual(open);
    const exited = [trade({}), trade({ id: "s", action: "sell", contracts: 100, price: 0.5, executedAt: "2026-10-14T00:00:00Z" })];
    expect(withSettlement(exited, quote({ resolved: true, resolvedPrice: 1 }))).toEqual(exited);
  });
});

describe("pickOutcome", () => {
  test("is up when the mark is above entry", () => {
    expect(pickOutcome(0.35, 0.405)).toBe("up");
  });
  test("is down when below", () => {
    expect(pickOutcome(0.7, 0)).toBe("down");
  });
  test("is flat when equal or unknown", () => {
    expect(pickOutcome(0.5, 0.5)).toBe("flat");
    expect(pickOutcome(0.5, null)).toBe("flat");
  });
});
