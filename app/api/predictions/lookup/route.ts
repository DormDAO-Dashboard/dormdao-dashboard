import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-guard";
import { parseMarketLink } from "@/lib/predictions/markets/parseLink";
import { lookupMarket } from "@/lib/predictions/markets/lookup";

const MAX_INPUT_LENGTH = 500;

// GET /api/predictions/lookup?link=<Polymarket/Kalshi URL or Kalshi ticker>
// Returns the market title and its outcomes with live YES prices, for the
// pitch submission form.
export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const link = new URL(req.url).searchParams.get("link") ?? "";
  if (link.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: "Link is too long." }, { status: 400 });
  }
  const parsed = parseMarketLink(link);
  if (!parsed) {
    return NextResponse.json(
      { error: "Paste a Polymarket or Kalshi market link (or a Kalshi ticker). For Synthesis, use the underlying market's link." },
      { status: 400 },
    );
  }
  try {
    const result = await lookupMarket(parsed);
    if (!result) return NextResponse.json({ error: "Couldn't find that market." }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    console.warn("[lookup]", link, err);
    return NextResponse.json({ error: "Market data provider is unavailable right now — try again shortly." }, { status: 502 });
  }
}
