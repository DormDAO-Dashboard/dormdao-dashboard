import { NextRequest, NextResponse } from "next/server";
import { getHistoricalEthPrices } from "@/lib/eth-price-history";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("dates") ?? "";
  const dates = raw.split(",").map((d) => d.trim()).filter(Boolean);
  const prices = await getHistoricalEthPrices(dates);
  return NextResponse.json({ prices });
}
