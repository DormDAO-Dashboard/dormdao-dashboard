import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const geckoId = searchParams.get("id");

  if (!geckoId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();
    const m = data.market_data ?? {};

    return NextResponse.json({
      marketCap: m.market_cap?.usd ?? null,
      volume24h: m.total_volume?.usd ?? null,
      circulatingSupply: m.circulating_supply ?? null,
      totalSupply: m.total_supply ?? null,
      ath: m.ath?.usd ?? null,
      athChangePercent: m.ath_change_percentage?.usd ?? null,
      fdv: m.fully_diluted_valuation?.usd ?? null,
      high24h: m.high_24h?.usd ?? null,
      low24h: m.low_24h?.usd ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
