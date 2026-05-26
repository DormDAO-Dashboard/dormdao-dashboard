import { NextRequest, NextResponse } from "next/server";

// Historical ETH prices never change — cache indefinitely in memory
const priceCache = new Map<string, number>();

// Convert sheet date formats to CoinGecko's DD-MM-YYYY
function toGeckoDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const s = dateStr.replace(/\//g, "-").trim();
  // YYYY-MM-DD → DD-MM-YYYY
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  return null;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("dates") ?? "";
  const dates = raw.split(",").map((d) => d.trim()).filter(Boolean);

  const result: Record<string, number> = {};

  for (const date of dates) {
    const geckoDate = toGeckoDate(date);
    if (!geckoDate) continue;

    if (priceCache.has(geckoDate)) {
      result[date] = priceCache.get(geckoDate)!;
      continue;
    }

    try {
      const url = `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${geckoDate}&localization=false`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const d = await r.json();
      const price: number = d?.market_data?.current_price?.usd ?? 0;
      if (price > 0) {
        priceCache.set(geckoDate, price);
        result[date] = price;
      }
    } catch {
      // skip failed dates
    }
  }

  return NextResponse.json({ prices: result });
}
