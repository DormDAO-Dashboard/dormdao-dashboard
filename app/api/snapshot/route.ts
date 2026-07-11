import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getSchoolsData } from "@/lib/cache";
import { Holding } from "@/lib/types";
import { sendPushNotifications } from "@/lib/push";
import { sendEmailNotifications } from "@/lib/email";

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

  // Respond immediately so cron-job.org doesn't time out waiting.
  // All actual work runs after the response is sent via after().
  after(async () => {
    try {
      const supabase = createServiceClient();
      const { data: recent } = await supabase
        .from("portfolio_snapshots")
        .select("captured_at")
        .order("captured_at", { ascending: false })
        .limit(1)
        .single();

      if (recent) {
        const ageMs = Date.now() - new Date(recent.captured_at).getTime();
        if (ageMs < 50 * 60 * 1000) return; // cooldown not elapsed
      }

      const { schools } = await getSchoolsData();

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
        console.error("[snapshot] insert error:", snapError.message);
        return;
      }

      const detectedAt = new Date().toISOString();
      const changeRows: Array<{
        school_name: string;
        change_type: string;
        token_ticker: string;
        old_quantity?: number;
        new_quantity?: number;
        eth_value?: number;
        detected_at: string;
      }> = [];

      for (const school of schools) {
        const prev = prevBySchool[school.name];
        if (!prev || prev.length === 0) continue;

        const prevMap = new Map(prev.map((h: StoredHolding) => [h.ticker, h]));
        const currHoldings = school.holdings ?? [];
        const currMap = new Map(currHoldings.map((h: Holding) => [h.ticker, h]));

        for (const [ticker, h] of currMap) {
          const prevH = prevMap.get(ticker);
          if (!prevH) {
            changeRows.push({ school_name: school.name, change_type: "buy", token_ticker: ticker, new_quantity: h.tokens, eth_value: h.costBasisEth, detected_at: detectedAt });
          } else if (h.tokens > prevH.tokens * 1.02) {
            changeRows.push({ school_name: school.name, change_type: "increase", token_ticker: ticker, old_quantity: prevH.tokens, new_quantity: h.tokens, eth_value: h.costBasisEth, detected_at: detectedAt });
          } else if (h.tokens < prevH.tokens * 0.98) {
            changeRows.push({ school_name: school.name, change_type: "decrease", token_ticker: ticker, old_quantity: prevH.tokens, new_quantity: h.tokens, eth_value: h.costBasisEth, detected_at: detectedAt });
          }
        }

        for (const [ticker, prevH] of prevMap) {
          if (!currMap.has(ticker)) {
            changeRows.push({ school_name: school.name, change_type: "sell", token_ticker: ticker, old_quantity: prevH.tokens, detected_at: detectedAt });
          }
        }
      }

      if (changeRows.length > 0) {
        await supabase.from("portfolio_changes").insert(changeRows);

        for (const change of changeRows) {
          const isBuy = change.change_type === "buy" || change.change_type === "increase";
          const isSell = change.change_type === "sell" || change.change_type === "decrease";
          if (!isBuy && !isSell) continue;
          const tradeType: "buy" | "sell" = isBuy ? "buy" : "sell";
          const tradePayload = {
            type: tradeType,
            title: isBuy
              ? `🟢 ${change.school_name} bought ${change.token_ticker}`
              : `🔴 ${change.school_name} trimmed ${change.token_ticker}`,
            body: isBuy
              ? `New position opened by ${change.school_name}`
              : `Position reduced by ${change.school_name}`,
            url: "https://dormdao-dashboard.vercel.app/activity",
          };
          await sendPushNotifications(tradePayload).catch(console.error);
          await sendEmailNotifications(tradePayload).catch(console.error);
        }
      }
      // Auto-resolve proposals whose voting deadline has passed
      const { data: expiredProposals } = await supabase
        .from("proposals")
        .select("id, yes_votes, no_votes")
        .eq("status", "active")
        .lt("voting_deadline", new Date().toISOString());

      if (expiredProposals && expiredProposals.length > 0) {
        for (const proposal of expiredProposals) {
          const resolvedStatus = proposal.yes_votes > proposal.no_votes ? "passed" : "rejected";
          await supabase
            .from("proposals")
            .update({ status: resolvedStatus })
            .eq("id", proposal.id);
        }
        console.log(`[snapshot] resolved ${expiredProposals.length} expired proposals`);
      }
    } catch (err) {
      console.error("[snapshot] unexpected error:", err);
    }
  });

  return NextResponse.json({ accepted: true });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const school = searchParams.get("school");

    const supabase = createServiceClient();

    let query = supabase
      .from("portfolio_snapshots")
      .select("id, captured_at, school_name, nav_usd, eth_return_pct, usd_return_pct, deployed_pct, holdings")
      .order("captured_at", { ascending: true });

    if (school) {
      query = query.ilike("school_name", school);
    }

    const { data, error } = await query.limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const snapshots = (data ?? []).map((row) => {
      const holdings = (row.holdings ?? []) as Array<{ ticker: string; tokens: number }>;
      const eth_balance = holdings
        .filter((h) => h.ticker === "ETH")
        .reduce((s, h) => s + (h.tokens ?? 0), 0);
      const { holdings: _h, ...rest } = row;
      void _h;
      return { ...rest, eth_balance };
    });

    return NextResponse.json({ snapshots });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
