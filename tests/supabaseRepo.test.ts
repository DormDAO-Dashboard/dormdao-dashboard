import { describe, expect, test } from "vitest";
import { pitchFromRow, roundFromRow, tradeFromRow, type PitchRow } from "@/lib/predictions/supabaseRepo";

const row = (r: Partial<PitchRow>): PitchRow => ({
  id: "p5-econ", round_number: 5, sector: "economics", analyst: "Ana", market_title: "CPI", outcome_label: "3.6%",
  venue: "polymarket", market_source: "polymarket", market_ids: ["cpi-slug"], side: "NO",
  entry_price: "0.5300", implied_price: "1.0000", sell_limit: null, sell_limit_before: null, stop_loss: "0.4000",
  exit_by: "2026-10-14", exit_price: null, exited_at: null, thesis: ["a", "b"], status: "open", recorded_votes: 7,
  ...r,
});

describe("pitchFromRow", () => {
  test("maps columns and parses Postgres numerics into numbers", () => {
    expect(pitchFromRow(row({}))).toEqual({
      id: "p5-econ", roundNumber: 5, sector: "economics", analyst: "Ana", marketTitle: "CPI", outcomeLabel: "3.6%",
      venue: "polymarket", market: { source: "polymarket", slug: "cpi-slug" }, side: "NO",
      entryPrice: 0.53, impliedPrice: 1, sellLimit: null, sellLimitBefore: null, stopLoss: 0.4,
      exitBy: "2026-10-14", exitPrice: null, exitedAt: null, thesis: ["a", "b"], status: "open", votes: 7,
    });
  });

  test("builds each market source from market_ids", () => {
    expect(pitchFromRow(row({ market_source: "kalshi", market_ids: ["KXGDP-T3.5"] })).market).toEqual({ source: "kalshi", ticker: "KXGDP-T3.5" });
    expect(pitchFromRow(row({ market_source: "polymarket_basket", market_ids: ["a", "b"] })).market).toEqual({ source: "polymarket_basket", slugs: ["a", "b"] });
    expect(pitchFromRow(row({ market_source: "manual", market_ids: [] })).market).toEqual({ source: "manual" });
  });

  test("keeps an early exit", () => {
    const p = pitchFromRow(row({ exit_price: "0.4200", exited_at: "2026-10-10", status: "closed" }));
    expect(p).toMatchObject({ exitPrice: 0.42, exitedAt: "2026-10-10", status: "closed" });
  });

  test("rejects a row whose market ids don't fit its source", () => {
    expect(() => pitchFromRow(row({ market_source: "kalshi", market_ids: [] }))).toThrow(/p5-econ/);
  });
});

describe("roundFromRow / tradeFromRow", () => {
  test("map rounds and trades", () => {
    expect(roundFromRow({ number: 8, published_at: "2026-10-29", medium_url: null, summary: "s", selected_pitch_id: "x" }))
      .toEqual({ number: 8, publishedAt: "2026-10-29", mediumUrl: null, summary: "s", selectedPitchId: "x" });
    expect(tradeFromRow({ id: "t", pitch_id: "x", action: "buy", contracts: "94.3396", price: "0.5300", executed_at: "2026-10-07T00:00:00+00:00", reason: null }))
      .toEqual({ id: "t", pitchId: "x", action: "buy", contracts: 94.3396, price: 0.53, executedAt: "2026-10-07T00:00:00+00:00", reason: null });
  });
});
