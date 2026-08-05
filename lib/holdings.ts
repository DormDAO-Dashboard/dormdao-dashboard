import { Holding } from "@/lib/types";

function parseDateMsAsc(dateStr: string): number {
  if (!dateStr) return Infinity;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return Infinity;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return Infinity;
  return new Date(y, m - 1, d).getTime();
}

// The source sheet sometimes lists the same ticker as multiple rows when a
// club bought it in separate tranches (different dates/costs) — e.g. Oregon's
// HYPE was bought once in 2025 and again today. Portfolio-level views (the
// holdings table, concentration chart, position stats) expect one row per
// token, so merge same-ticker rows into a single aggregated position.
//
// Per-tranche views (Activity feed, Recent Buys) should keep using the raw,
// unmerged holdings array instead, so a fresh second tranche still shows up
// as its own recent buy rather than being absorbed into an older date.
export function mergeHoldingsByTicker(holdings: Holding[]): Holding[] {
  const order: string[] = [];
  const groups = new Map<string, Holding[]>();
  for (const h of holdings) {
    if (!groups.has(h.ticker)) {
      order.push(h.ticker);
      groups.set(h.ticker, []);
    }
    groups.get(h.ticker)!.push(h);
  }

  return order.map((ticker) => {
    const rows = groups.get(ticker)!;
    if (rows.length === 1) return rows[0];

    const totalCostEth = rows.reduce((s, r) => s + r.costBasisEth, 0);
    const weight = (r: Holding) => (totalCostEth > 0 ? r.costBasisEth / totalCostEth : 1 / rows.length);

    const gains = rows.map((r) => r.gainUsd).filter((g): g is number => g !== undefined);
    const marketValues = rows.map((r) => r.marketValueUsd).filter((v): v is number => v !== undefined);

    const dated = rows.filter((r) => r.investmentDate);
    const earliestDate = dated.length > 0
      ? dated.reduce((best, r) => (parseDateMsAsc(r.investmentDate) < parseDateMsAsc(best.investmentDate) ? r : best)).investmentDate
      : "";

    return {
      ticker,
      blockchain: rows.find((r) => r.blockchain)?.blockchain ?? "",
      tokens: rows.reduce((s, r) => s + r.tokens, 0),
      entryFdv: rows.find((r) => r.entryFdv)?.entryFdv ?? "",
      costBasisEth: totalCostEth,
      pctOfPortfolio: rows.reduce((s, r) => s + r.pctOfPortfolio, 0),
      investmentDate: earliestDate,
      ...(marketValues.length > 0 ? { marketValueUsd: marketValues.reduce((s, v) => s + v, 0) } : {}),
      ...(gains.length > 0 ? { gainUsd: gains.reduce((s, g) => s + g, 0) } : {}),
      ...(rows.some((r) => r.roiUsdPct !== undefined)
        ? { roiUsdPct: rows.reduce((s, r) => s + (r.roiUsdPct ?? 0) * weight(r), 0) }
        : {}),
      ...(rows.some((r) => r.roiEthPct !== undefined)
        ? { roiEthPct: rows.reduce((s, r) => s + (r.roiEthPct ?? 0) * weight(r), 0) }
        : {}),
    };
  });
}
