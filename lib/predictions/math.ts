import type { Quote, Side, Trade } from "@/lib/predictions/types";

// % return from buying at `entry` and marking/exiting at `exit`.
export function returnPct(entry: number, exit: number): number | null {
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

// Convert a YES price into the price of the pitch's chosen side.
export function sidePrice(yesPrice: number, side: Side): number {
  return side === "YES" ? yesPrice : 1 - yesPrice;
}

// Price a position should be marked at: payout once resolved, else live.
export function markPrice(quote: Quote | null): number | null {
  if (!quote) return null;
  if (quote.resolved && quote.resolvedPrice !== null) return quote.resolvedPrice;
  return quote.price;
}

export type PickOutcome = "up" | "down" | "flat";

export function pickOutcome(entry: number, mark: number | null): PickOutcome {
  if (mark === null || mark === entry) return "flat";
  return mark > entry ? "up" : "down";
}

// Once a market resolves, any contracts still held are settled at the payout
// (0 or 1). Appending that fill turns them from "open" into realized P&L.
export function withSettlement(trades: Trade[], quote: Quote | null): Trade[] {
  if (!quote?.resolved || quote.resolvedPrice === null || trades.length === 0) return trades;
  const open = summarizePosition(trades, null).contractsOpen;
  if (open <= 0) return trades;
  // Must sort after every existing fill (summarizePosition orders by date;
  // ties keep insertion order), so never date it before the latest one.
  const latest = trades.reduce((max, t) => (t.executedAt > max ? t.executedAt : max), "");
  const settledAt = quote.closesAt && quote.closesAt > latest ? quote.closesAt : latest;
  return [...trades, {
    id: `settle-${trades[0].pitchId}`,
    pitchId: trades[0].pitchId,
    action: "resolve",
    contracts: open,
    price: quote.resolvedPrice,
    executedAt: settledAt,
    reason: "resolution",
  }];
}

export interface PositionSummary {
  contractsOpen: number;
  costBasis: number;        // $ cost of contracts still open
  avgEntry: number | null;  // average cost per contract across all buys
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  marketValue: number;
}

// Average-cost accounting. Trades are processed in time order; sells and
// resolutions realize P&L against the running average entry. Sells larger
// than the open size are clamped (a data-entry error shouldn't produce a
// negative position).
export function summarizePosition(trades: Trade[], mark: number | null): PositionSummary {
  const ordered = [...trades].sort((a, b) => a.executedAt.localeCompare(b.executedAt));
  const initial = { contractsOpen: 0, costBasis: 0, realizedPnl: 0, boughtContracts: 0, boughtCost: 0 };

  const totals = ordered.reduce((acc, t) => {
    if (t.action === "buy") {
      return {
        ...acc,
        contractsOpen: acc.contractsOpen + t.contracts,
        costBasis: acc.costBasis + t.contracts * t.price,
        boughtContracts: acc.boughtContracts + t.contracts,
        boughtCost: acc.boughtCost + t.contracts * t.price,
      };
    }
    const qty = Math.min(t.contracts, acc.contractsOpen);
    if (qty <= 0) return acc;
    const avg = acc.costBasis / acc.contractsOpen;
    return {
      ...acc,
      contractsOpen: acc.contractsOpen - qty,
      costBasis: acc.costBasis - qty * avg,
      realizedPnl: acc.realizedPnl + qty * (t.price - avg),
    };
  }, initial);

  const marketValue = mark !== null ? totals.contractsOpen * mark : totals.costBasis;
  const unrealizedPnl = totals.contractsOpen > 0 && mark !== null ? marketValue - totals.costBasis : 0;

  return {
    contractsOpen: totals.contractsOpen,
    costBasis: totals.costBasis,
    avgEntry: totals.boughtContracts > 0 ? totals.boughtCost / totals.boughtContracts : null,
    realizedPnl: totals.realizedPnl,
    unrealizedPnl,
    totalPnl: totals.realizedPnl + unrealizedPnl,
    marketValue,
  };
}
