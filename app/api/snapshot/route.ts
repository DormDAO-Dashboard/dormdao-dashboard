import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchSheetsData } from "@/lib/sheets";
import { Holding } from "@/lib/types";

interface StoredHolding {
  ticker: string;
  tokens: number;
  costBasisEth: number;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseCheck = createServiceClient();
    const { data: recent } = await supabaseCheck
      .from("portfolio_snapshots")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(1)
      .single();

    if (recent) {
      const ageMs = Date.now() - new Date(recent.captured_at).getTime();
      if (ageMs < 6 * 60 * 60 * 1000) {
        return NextResponse.json({
          skipped: true,
          reason: `Last snapshot was ${Math.round(ageMs / 60000)} minutes ago — waiting for 6h cooldown`,
        });
      }
    }

    const { schools } = await fetchSheetsData();
    const supabase = supabaseCheck;

    // Get the most recent snapshot per school for change detection
    const { data: prevSnapshots } = await supabase
      .from("portfolio_snapshots")
      .select("school_name, holdings, captured_at")
      .order("captured_at", { ascending: false })
      .limit(schools.length * 3);

    const prevBySchool: Record<string, StoredHolding[]> = {};
    if (prevSnapshots) {
      for (const snap of prevSnapshots) {
        if (!prevBySchool[snap.school_name]) {
          prevBySchool[snap.school_name] = (snap.holdings as StoredHolding[]) ?? [];
        }
      }
    }

    // Build snapshot rows
    const snapRows = schools.map(s => ({
      school_name: s.name,
      nav_usd: s.nav,
      eth_return_pct: s.ethReturn,
      usd_return_pct: s.usdReturn,
      deployed_pct: s.pctDeployed,
      holdings: (s.holdings ?? []).map((h: Holding) => ({
        ticker: h.ticker,
        tokens: h.tokens,
        costBasisEth: h.costBasisEth,
        blockchain: h.blockchain,
        investmentDate: h.investmentDate,
      })),
    }));

    const { error: snapError } = await supabase
      .from("portfolio_snapshots")
      .insert(snapRows);

    if (snapError) {
      return NextResponse.json({ error: snapError.message }, { status: 500 });
    }

    // Detect changes by comparing with previous snapshot
    const changeRows: Array<{
      school_name: string;
      change_type: string;
      token_ticker: string;
      old_quantity?: number;
      new_quantity?: number;
      eth_value?: number;
    }> = [];

    for (const school of schools) {
      const prev = prevBySchool[school.name];
      if (!prev || prev.length === 0) continue;

      const prevMap = new Map(prev.map((h: StoredHolding) => [h.ticker, h]));
      const currHoldings = school.holdings ?? [];
      const currMap = new Map(currHoldings.map((h: Holding) => [h.ticker, h]));

      // New buys and size changes
      for (const [ticker, h] of currMap) {
        const prevH = prevMap.get(ticker);
        if (!prevH) {
          changeRows.push({
            school_name: school.name,
            change_type: "buy",
            token_ticker: ticker,
            new_quantity: h.tokens,
            eth_value: h.costBasisEth,
          });
        } else if (h.tokens > prevH.tokens * 1.02) {
          changeRows.push({
            school_name: school.name,
            change_type: "increase",
            token_ticker: ticker,
            old_quantity: prevH.tokens,
            new_quantity: h.tokens,
            eth_value: h.costBasisEth,
          });
        } else if (h.tokens < prevH.tokens * 0.98) {
          changeRows.push({
            school_name: school.name,
            change_type: "decrease",
            token_ticker: ticker,
            old_quantity: prevH.tokens,
            new_quantity: h.tokens,
            eth_value: h.costBasisEth,
          });
        }
      }

      // Sells (position fully removed)
      for (const [ticker, prevH] of prevMap) {
        if (!currMap.has(ticker)) {
          changeRows.push({
            school_name: school.name,
            change_type: "sell",
            token_ticker: ticker,
            old_quantity: prevH.tokens,
          });
        }
      }
    }

    if (changeRows.length > 0) {
      await supabase.from("portfolio_changes").insert(changeRows);
    }

    return NextResponse.json({
      success: true,
      snapshotCount: snapRows.length,
      changesDetected: changeRows.length,
      changes: changeRows,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");

    const supabase = createServiceClient();

    let query = supabase
      .from("portfolio_snapshots")
      .select("id, captured_at, school_name, nav_usd, eth_return_pct, usd_return_pct, deployed_pct")
      .order("captured_at", { ascending: true });

    if (school) {
      query = query.ilike("school_name", school);
    }

    const { data, error } = await query.limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ snapshots: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
