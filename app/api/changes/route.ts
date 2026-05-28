import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");
    const type = searchParams.get("type"); // "trim" | "buy" | "all"

    const supabase = createServiceClient();

    let query = supabase
      .from("portfolio_changes")
      .select("id, school_name, change_type, token_ticker, old_quantity, new_quantity, eth_value")
      .limit(200);

    if (school) {
      query = query.ilike("school_name", school);
    }

    // "trim" = decrease or sell of non-ETH tokens
    if (type === "trim") {
      query = query.in("change_type", ["decrease", "sell"]).neq("token_ticker", "ETH");
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ changes: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
