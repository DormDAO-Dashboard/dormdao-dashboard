import { describe, expect, test } from "vitest";
import { combineYes, sumSeries } from "@/lib/predictions/markets/basket";

const q = (yes: number | null, resolvedYes: number | null = null, closesAt: string | null = null) => ({ yes, resolvedYes, closesAt });

describe("combineYes", () => {
  test("sums leg prices for mutually exclusive outcomes", () => {
    const out = combineYes([q(0.34, null, "2026-11-04T00:00:00Z"), q(0.17, null, "2026-11-03T00:00:00Z")]);
    expect(out?.yes).toBeCloseTo(0.51);
    expect(out?.resolvedYes).toBeNull();
    expect(out?.closesAt).toBe("2026-11-03T00:00:00Z");
  });

  test("returns null when any leg is unavailable", () => {
    expect(combineYes([q(0.3), null])).toBeNull();
  });

  test("price is null when any leg has no price", () => {
    expect(combineYes([q(0.3), q(null)])?.yes).toBeNull();
  });

  test("resolves YES as soon as one leg resolves YES", () => {
    expect(combineYes([q(1, 1), q(0.01)])?.resolvedYes).toBe(1);
  });

  test("resolves NO only once every leg resolves NO", () => {
    expect(combineYes([q(0, 0), q(0.02)])?.resolvedYes).toBeNull();
    expect(combineYes([q(0, 0), q(0, 0)])?.resolvedYes).toBe(0);
  });

  test("caps the summed price at 1", () => {
    expect(combineYes([q(0.7), q(0.5)])?.yes).toBe(1);
  });
});

describe("sumSeries", () => {
  test("sums legs, carrying each leg's last price forward", () => {
    const a = [{ time: 1, price: 0.3 }, { time: 3, price: 0.4 }];
    const b = [{ time: 2, price: 0.1 }, { time: 4, price: 0.2 }];
    expect(sumSeries([a, b]).map((p) => [p.time, Number(p.price.toFixed(2))])).toEqual([
      [2, 0.4],
      [3, 0.5],
      [4, 0.6],
    ]);
  });

  test("returns empty when any leg has no history", () => {
    expect(sumSeries([[{ time: 1, price: 0.3 }], []])).toEqual([]);
  });
});
