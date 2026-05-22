import { NextRequest, NextResponse } from "next/server";
import { TICKER_TO_COINGECKO } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get("tickers");
  const tickers = tickersParam
    ? tickersParam.split(",").map((t) => t.trim().toUpperCase())
    : Object.keys(TICKER_TO_COINGECKO);

  const ids = tickers
    .map((t) => TICKER_TO_COINGECKO[t])
    .filter(Boolean)
    .join(",");

  if (!ids) {
    return NextResponse.json({ prices: {}, fetchedAt: new Date().toISOString() });
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();

    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const ticker of tickers) {
      const geckoId = TICKER_TO_COINGECKO[ticker];
      if (geckoId && data[geckoId]) {
        prices[ticker] = {
          usd: data[geckoId].usd ?? 0,
          usd_24h_change: data[geckoId].usd_24h_change ?? 0,
        };
      }
    }

    return NextResponse.json({ prices, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg, prices: {} }, { status: 500 });
  }
}
