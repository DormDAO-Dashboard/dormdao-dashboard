import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const geckoId = searchParams.get("id");
  const days = searchParams.get("days") || "7";

  if (!geckoId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`,
      { next: { revalidate: days === "7" ? 300 : 3600 } }
    );

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
