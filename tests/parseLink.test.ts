import { describe, expect, test } from "vitest";
import { parseMarketLink } from "@/lib/predictions/markets/parseLink";

describe("parseMarketLink", () => {
  test("Polymarket event URL", () => {
    expect(parseMarketLink("https://polymarket.com/event/texas-senate-and-governor-combo-20260807213940452"))
      .toEqual({ source: "polymarket", eventSlug: "texas-senate-and-governor-combo-20260807213940452", marketSlug: null });
  });

  test("Polymarket event URL with a specific market and query string", () => {
    expect(parseMarketLink("polymarket.com/event/brazil-x/will-flavio-win-by-less-than-4?tid=123"))
      .toEqual({ source: "polymarket", eventSlug: "brazil-x", marketSlug: "will-flavio-win-by-less-than-4" });
  });

  test("Polymarket /market/ URL", () => {
    expect(parseMarketLink("https://www.polymarket.com/market/bitcoin-above-82000-on-october-16"))
      .toEqual({ source: "polymarket", eventSlug: null, marketSlug: "bitcoin-above-82000-on-october-16" });
  });

  test("Kalshi market page URL keeps the event ticker, uppercased", () => {
    expect(parseMarketLink("https://kalshi.com/markets/kxgdp/us-gdp-growth/kxgdp-26oct30"))
      .toEqual({ source: "kalshi", ticker: "KXGDP-26OCT30" });
  });

  test("raw Kalshi event and market tickers", () => {
    expect(parseMarketLink("KXGDP-26OCT30")).toEqual({ source: "kalshi", ticker: "KXGDP-26OCT30" });
    expect(parseMarketLink(" kxgdp-26oct30-t3.5 ")).toEqual({ source: "kalshi", ticker: "KXGDP-26OCT30-T3.5" });
  });

  test("rejects unsupported or malformed input", () => {
    expect(parseMarketLink("")).toBeNull();
    expect(parseMarketLink("https://synthesis.trade/m/abc")).toBeNull();
    expect(parseMarketLink("https://polymarket.com/")).toBeNull();
    expect(parseMarketLink("not a link")).toBeNull();
  });
});
