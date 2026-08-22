import { NextRequest, NextResponse } from "next/server";
import { TICKER_TO_COINGECKO } from "@/lib/tokens";
import { getPricesForTickers } from "@/lib/prices";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get("tickers");
  const tickers = tickersParam
    ? tickersParam.split(",").map((t) => t.trim().toUpperCase())
    : Object.keys(TICKER_TO_COINGECKO);

  try {
    const prices = await getPricesForTickers(tickers);
    return NextResponse.json({ prices, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg, prices: {} }, { status: 500 });
  }
}
