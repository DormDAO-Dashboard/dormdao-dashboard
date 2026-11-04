import type { PricePoint } from "@/lib/predictions/types";
import type { YesQuote } from "@/lib/predictions/markets/http";

// A basket is several mutually exclusive outcomes bought together (e.g.
// "Talarico 0–3%" + "Paxton 0–3%"). At most one leg can pay out, so the
// basket's YES price is the sum of the legs' YES prices.

const sum = (xs: number[]) => Math.min(1, xs.reduce((a, b) => a + b, 0));

export function combineYes(legs: (YesQuote | null)[]): YesQuote | null {
  if (legs.length === 0 || legs.some((l) => l === null)) return null;
  const quotes = legs as YesQuote[];

  const prices = quotes.map((l) => l.yes);
  const yes = prices.some((p) => p === null) ? null : sum(prices as number[]);

  // One leg winning settles the basket YES; NO needs every leg to lose.
  const resolvedYes = quotes.some((l) => l.resolvedYes === 1)
    ? 1
    : quotes.every((l) => l.resolvedYes === 0) ? 0 : null;

  const closes = quotes.map((l) => l.closesAt).filter((c): c is string => c !== null).sort();
  return { yes, resolvedYes, closesAt: closes[0] ?? null };
}

// Sum price series on the union of their timestamps, carrying each leg's last
// known price forward. Starts once every leg has a price.
export function sumSeries(series: PricePoint[][]): PricePoint[] {
  if (series.length === 0 || series.some((s) => s.length === 0)) return [];
  const sorted = series.map((s) => [...s].sort((a, b) => a.time - b.time));
  const times = [...new Set(sorted.flat().map((p) => p.time))].sort((a, b) => a - b);

  const cursors = sorted.map(() => -1);
  return times.flatMap((time) => {
    sorted.forEach((s, i) => {
      while (cursors[i] + 1 < s.length && s[cursors[i] + 1].time <= time) cursors[i] += 1;
    });
    if (cursors.some((c) => c < 0)) return [];
    return [{ time, price: sum(sorted.map((s, i) => s[cursors[i]].price)) }];
  });
}
