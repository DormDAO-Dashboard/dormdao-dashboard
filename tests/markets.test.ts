import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchPolymarketYes, fetchPolymarketHistory } from "@/lib/predictions/markets/polymarket";
import { fetchKalshiYes, fetchKalshiHistory } from "@/lib/predictions/markets/kalshi";

function mockFetch(routes: Record<string, unknown>) {
  const fn = vi.fn(async (input: string | URL) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status: 200 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

const polyMarket = (over: Record<string, unknown> = {}) => ({
  slug: "brazil-under-4",
  outcomes: JSON.stringify(["Yes", "No"]),
  outcomePrices: JSON.stringify(["0.405", "0.595"]),
  clobTokenIds: JSON.stringify(["111", "222"]),
  closed: false,
  endDate: "2026-10-26T03:59:00Z",
  ...over,
});

describe("polymarket", () => {
  test("reads the YES price of an open market", async () => {
    mockFetch({ "gamma-api.polymarket.com/markets": [polyMarket()] });
    const q = await fetchPolymarketYes("brazil-under-4");
    expect(q).toMatchObject({ yes: 0.405, resolvedYes: null, closesAt: "2026-10-26T03:59:00Z" });
  });

  test("detects a market resolved NO", async () => {
    mockFetch({ "gamma-api.polymarket.com/markets": [polyMarket({ closed: true, outcomePrices: JSON.stringify(["0", "1"]) })] });
    const q = await fetchPolymarketYes("btc-82k");
    expect(q).toMatchObject({ yes: 0, resolvedYes: 0 });
  });

  test("finds YES even when outcomes are ordered differently", async () => {
    mockFetch({
      "gamma-api.polymarket.com/markets": [polyMarket({
        outcomes: JSON.stringify(["No", "Yes"]),
        outcomePrices: JSON.stringify(["0.7", "0.3"]),
      })],
    });
    expect((await fetchPolymarketYes("x"))?.yes).toBe(0.3);
  });

  test("falls back to closed=true for a resolved market hidden from the default lookup", async () => {
    const fn = vi.fn(async (input: string | URL) => {
      const url = String(input);
      const body = url.includes("closed=true")
        ? [polyMarket({ closed: true, outcomePrices: JSON.stringify(["0", "1"]) })]
        : [];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal("fetch", fn);
    expect(await fetchPolymarketYes("btc-82k")).toMatchObject({ yes: 0, resolvedYes: 0 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("returns null for an unknown slug", async () => {
    mockFetch({ "gamma-api.polymarket.com/markets": [] });
    expect(await fetchPolymarketYes("nope")).toBeNull();
  });

  test("loads YES token history as ms timestamps", async () => {
    const fetchFn = mockFetch({
      "gamma-api.polymarket.com/markets": [polyMarket()],
      "clob.polymarket.com/prices-history": { history: [{ t: 1_792_000_000, p: 0.35 }, { t: 1_792_003_600, p: 0.37 }] },
    });
    const h = await fetchPolymarketHistory("brazil-under-4", 1_791_000_000_000);
    expect(h).toEqual([{ time: 1_792_000_000_000, price: 0.35 }, { time: 1_792_003_600_000, price: 0.37 }]);
    expect(String(fetchFn.mock.calls[1][0])).toContain("market=111");
  });
});

const kalshiMarket = (over: Record<string, unknown> = {}) => ({
  ticker: "KXGDP-26OCT30-T3.5",
  event_ticker: "KXGDP-26OCT30",
  status: "active",
  result: "",
  last_price_dollars: "0.2800",
  yes_bid_dollars: "0.2700",
  yes_ask_dollars: "0.2900",
  close_time: "2026-10-30T12:29:00Z",
  ...over,
});

describe("kalshi", () => {
  test("uses last traded price as YES", async () => {
    mockFetch({ "/markets/KXGDP-26OCT30-T3.5": { market: kalshiMarket() } });
    const q = await fetchKalshiYes("KXGDP-26OCT30-T3.5");
    expect(q).toMatchObject({ yes: 0.28, resolvedYes: null, closesAt: "2026-10-30T12:29:00Z" });
  });

  test("falls back to bid/ask midpoint with no trades", async () => {
    mockFetch({ "/markets/T": { market: kalshiMarket({ last_price_dollars: "0.0000", yes_bid_dollars: "0.40", yes_ask_dollars: "0.50" }) } });
    expect((await fetchKalshiYes("T"))?.yes).toBeCloseTo(0.45);
  });

  test("reports settlement result", async () => {
    mockFetch({ "/markets/T": { market: kalshiMarket({ status: "finalized", result: "yes" }) } });
    expect(await fetchKalshiYes("T")).toMatchObject({ yes: 1, resolvedYes: 1 });
  });

  test("builds history from candle closes, skipping empty candles", async () => {
    const fetchFn = mockFetch({
      "/markets/KXGDP-26OCT30-T3.5/candlesticks": {
        candlesticks: [
          { end_period_ts: 100, price: { close_dollars: "0.36" }, yes_bid: { close_dollars: "0.35" }, yes_ask: { close_dollars: "0.37" } },
          { end_period_ts: 200, price: { close_dollars: null }, yes_bid: { close_dollars: "0.30" }, yes_ask: { close_dollars: "0.34" } },
          { end_period_ts: 300, price: {}, yes_bid: {}, yes_ask: {} },
        ],
      },
    });
    const h = await fetchKalshiHistory("KXGDP-26OCT30-T3.5", 0);
    expect(h).toEqual([{ time: 100_000, price: 0.36 }, { time: 200_000, price: 0.32 }]);
    expect(String(fetchFn.mock.calls[0][0])).toContain("/series/KXGDP/markets/");
  });
});
