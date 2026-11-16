import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getSchoolsData } from "@/lib/cache";
import { Holding, ExitedHolding } from "@/lib/types";
import { sendPushNotifications } from "@/lib/push";
import { send12HourWarningEmail, sendLiquidationAlertEmail } from "@/lib/email";
import { getCurrentFdvForTickers, checkLiquidationStatus } from "@/lib/fdv";
import type { Proposal } from "@/lib/proposals";
import { resolveExpiredProposals } from "@/lib/proposal-resolution";
import { inceptionBaselineForYear, SEASON_START_NAV_ETH, SEASON_START_DATE } from "@/lib/seasonBaseline";
import { schoolNameFromSlug } from "@/lib/schoolData";
import { slugify } from "@/lib/utils";
import { fetchCoinGecko } from "@/lib/coingecko";

// A school can act on the Programmatic Liquidation Policy's 50% trim
// manually/early, ahead of (or instead of relying on) this automated
// check — recorded as a "trim" exit row dated the same day the
// still-active lot it came from was opened. If what's already been
// trimmed off that lot is at least as large as what's still held, that
// 50% liquidation has effectively already happened, and alerting again
// (whether the 90% warning or the full threshold-crossed email) would
// just be noise. Sums every matching trim row rather than just the
// largest, in case a lot was trimmed down in more than one pass.
function alreadyTrimmedForPolicy(exitedHoldings: ExitedHolding[], h: Holding): boolean {
  const trimmedTokens = exitedHoldings
    .filter((e) => e.exitType === "trim" && e.ticker === h.ticker && e.investmentDate === h.investmentDate)
    .reduce((sum, e) => sum + e.tokensSold, 0);
  return trimmedTokens >= h.tokens;
}

interface StoredHolding {
  ticker: string;
  tokens: number;
  costBasisEth: number;
  marketValueUsd?: number;
  gainUsd?: number;
  roiUsdPct?: number;
  roiEthPct?: number;
}

// Called by the cron-job.org scheduler (Bearer CRON_SECRET, no session) and
// by an admin's "Capture Snapshot" button in the dashboard (browser session,
// no header at all — the client must never hold a bearer credential that
// could be confused with the real CRON_SECRET).
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return true;

  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "dorm_admin";
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Respond immediately so cron-job.org doesn't time out waiting.
  // All actual work runs after the response is sent via after().
  after(async () => {
    try {
      const supabase = createServiceClient();

      // Resolve expired proposals (and repost passed ones to Main DAO) on
      // every call, BEFORE the snapshot cooldown check below — this used to
      // run last, behind that early return, so a passed vote could wait
      // hours for a cron run that happened to clear the cooldown. The
      // proposals GET route also calls this, so it normally fires as soon as
      // anyone views a voting page; this is the backstop.
      await resolveExpiredProposals(supabase).catch((err) =>
        console.error("[snapshot] proposal auto-resolve/repost failed:", err));

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

      // Fetch two stored cycles per school (not just the last one) — sell
      // detection below needs both to require a disappearance to be
      // confirmed across two independent computations before treating it as
      // real, rather than reacting to a single glitchy read.
      const { data: prevSnapshots } = await supabase
        .from("portfolio_snapshots")
        .select("school_name, holdings, captured_at")
        .order("captured_at", { ascending: false })
        .limit(schools.length * 6);

      const prevBySchool: Record<string, StoredHolding[]> = {};
      const twoAgoBySchool: Record<string, StoredHolding[]> = {};
      if (prevSnapshots) {
        const seenCount: Record<string, number> = {};
        for (const snap of prevSnapshots) {
          const n = (seenCount[snap.school_name] ?? 0) + 1;
          seenCount[snap.school_name] = n;
          if (n === 1) {
            prevBySchool[snap.school_name] = (snap.holdings as StoredHolding[]) ?? [];
          } else if (n === 2) {
            twoAgoBySchool[snap.school_name] = (snap.holdings as StoredHolding[]) ?? [];
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
          // Position-level USD value + P&L/ROI as of this snapshot — not
          // used by the buy/sell-detection diffing below (that only reads
          // ticker/tokens/costBasisEth), but once enough daily snapshots
          // pile up, diffing this field across two captured_at dates is
          // what makes real Month-to-Date / Season-to-Date per-position
          // figures possible (see the portfolio-report-email work).
          marketValueUsd: h.marketValueUsd,
          gainUsd: h.gainUsd,
          roiUsdPct: h.roiUsdPct,
          roiEthPct: h.roiEthPct,
        })),
        // Kept in its own column, not merged into `holdings` above — the
        // buy/sell/exit diffing below (and its stored-snapshot comparisons
        // across cycles) has no NFT awareness at all, and mixing NFTs into
        // the one array it reads would make every held NFT look like it
        // "disappeared" each cycle, eventually firing a false sell
        // notification. See supabase-nft-snapshot-migration.sql.
        nft_holdings: (s.nftHoldings ?? []).map((h: Holding) => ({
          ticker: h.ticker,
          tokens: h.tokens,
          costBasisEth: h.costBasisEth,
          blockchain: h.blockchain,
          investmentDate: h.investmentDate,
          marketValueUsd: h.marketValueUsd,
          gainUsd: h.gainUsd,
          roiUsdPct: h.roiUsdPct,
          roiEthPct: h.roiEthPct,
        })),
      }));

      const { error: snapError } = await supabase
        .from("portfolio_snapshots")
        .insert(snapRows);
      if (snapError) {
        console.error("[snapshot] insert error:", snapError.message);
        return;
      }

      // This whole change-detection/notification stage is try/caught on its
      // own — same reasoning as the liquidation/warning/resolve stages
      // below: an external call failing here (sendPushNotifications, say)
      // must not prevent those independent stages from running.
      try {

      // Final authoritative check for admin-tracked positions: whatever
      // upstream computation produced this cycle's `schools.holdings`
      // (Sheets parsing, CoinGecko price resolution, positions-table read —
      // any of which can drop a row without the position actually having
      // changed, see the sell-detection comment below), the `positions`
      // table itself is the real source of truth for a school managed that
      // way. A fresh, direct read of it here means a ticker that still has
      // a row there can never be reported as sold, regardless of what bug
      // might exist further up the computation chain.
      const { data: livePositionRows } = await supabase.from("positions").select("school, ticker");
      const stillInPositionsTable = new Set(
        (livePositionRows ?? []).map((r) => `${r.school}::${r.ticker.toUpperCase()}`)
      );

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

        // A school can hold the same ticker across multiple tranches (e.g.
        // two separate HYPE buys on different dates — see lib/holdings.ts).
        // Building a Map keyed by ticker straight from the holdings array
        // silently drops every tranche but the last one sharing a ticker,
        // which corrupted quantity comparisons below for any multi-tranche
        // position. Aggregate to one total-tokens figure per ticker first —
        // this file only needs "how much of this ticker does the school
        // hold," never the per-tranche breakdown the Active Holdings table
        // (unmerged, deliberately) shows.
        //
        // ETH is deliberately excluded here entirely — it's the school's
        // idle treasury balance, not an acquired position (see CLAUDE.md),
        // so it must never surface as a "New position opened" / "trimmed" /
        // "sold" notification. Concretely: selling a real position (HYPE,
        // say) returns proceeds to the treasury, which raises the ETH
        // balance the very same cycle — without this exclusion that
        // increase reads as a brand-new "ETH position opened" right
        // alongside the real sell.
        const aggregateByTicker = (rows: StoredHolding[]): Map<string, StoredHolding> => {
          const out = new Map<string, StoredHolding>();
          for (const h of rows) {
            if (h.ticker === "ETH") continue;
            const existing = out.get(h.ticker);
            if (existing) {
              existing.tokens += h.tokens;
              existing.costBasisEth += h.costBasisEth;
            } else {
              out.set(h.ticker, { ticker: h.ticker, tokens: h.tokens, costBasisEth: h.costBasisEth });
            }
          }
          return out;
        };

        const prevMap = aggregateByTicker(prev);
        const currHoldings = school.holdings ?? [];
        const currMap = aggregateByTicker(
          currHoldings.map((h: Holding) => ({ ticker: h.ticker, tokens: h.tokens, costBasisEth: h.costBasisEth }))
        );

        // Log every first-cycle disappearance, confirmed or not — if this
        // keeps naming the same ticker+school every cycle instead of
        // resolving one way or the other within a run or two, that's the
        // signature of a persistent upstream bug (not a one-off glitch) and
        // points straight at which school/ticker to dig into next.
        for (const ticker of prevMap.keys()) {
          if (!currMap.has(ticker)) {
            console.warn(`[snapshot] ${school.name} ${ticker} missing from this cycle's live holdings (was present last stored cycle)`);
          }
        }

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

        // Sell detection needs to be skeptical of a single missing row: a
        // transient Sheets/CoinGecko/Supabase read glitch can drop one
        // ticker from a live computation without the position actually
        // having been sold (see lib/positions.ts and lib/cache.ts's
        // patchZeroedFromSnapshot for the same class of bug at the
        // whole-school level). So a ticker that just disappeared THIS cycle
        // (present last stored cycle, missing now) is never reported here —
        // that only gets recorded next cycle, if it's still gone by then.
        // What we fire on now is the CONFIRMED case: a ticker present two
        // stored cycles ago that had already dropped out of the last stored
        // snapshot AND is still absent from this cycle's live holdings —
        // two independent computations, one cycle apart, agreeing it's
        // gone. Schools without two full cycles of history yet (twoAgo
        // unavailable) fall back to firing on the first miss, so exit
        // detection isn't blocked while that history builds up.
        const sellCandidates: Array<{ ticker: string; oldQuantity: number }> = [];
        const twoAgo = twoAgoBySchool[school.name];
        if (twoAgo && twoAgo.length > 0) {
          for (const [ticker, h] of aggregateByTicker(twoAgo)) {
            if (prevMap.has(ticker)) continue; // still present as of last stored cycle — not a candidate yet
            if (currMap.has(ticker)) continue; // reappeared — last cycle's drop was itself a glitch
            sellCandidates.push({ ticker, oldQuantity: h.tokens });
          }
        } else {
          for (const [ticker, prevH] of prevMap) {
            if (!currMap.has(ticker)) {
              sellCandidates.push({ ticker, oldQuantity: prevH.tokens });
            }
          }
        }

        // More than one ticker confirmed "sold" for the same school in the
        // same cycle is exactly the shape of a shared upstream glitch (a
        // Sheets/gviz hiccup dropping several rows for two cycles running)
        // rather than a real, deliberate multi-position exit — clubs don't
        // typically liquidate several distinct tokens in the same ~hour
        // window. A single confirmed sell still fires normally; a burst
        // gets held back and logged loudly for manual review instead of
        // auto-posting false EXIT entries and sell notifications.
        if (sellCandidates.length > 1) {
          console.error(
            `[snapshot] suppressed ${sellCandidates.length} simultaneous "sell" candidates for ${school.name} ` +
            `(${sellCandidates.map((c) => c.ticker).join(", ")}) — looks like an upstream data glitch, not a real mass exit`
          );
        } else {
          for (const { ticker, oldQuantity } of sellCandidates) {
            if (stillInPositionsTable.has(`${school.name}::${ticker}`)) {
              console.warn(`[snapshot] suppressed false "sell" for ${school.name} ${ticker} — still has a positions-table row`);
              continue;
            }
            changeRows.push({ school_name: school.name, change_type: "sell", token_ticker: ticker, old_quantity: oldQuantity, detected_at: detectedAt });
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
            url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://dormdao-dashboard.vercel.app"}/activity`,
          };
          // Email deliberately stopped here — a detected buy/sell/increase/
          // decrease is a live sheet snapshot's best guess at what happened,
          // not a confirmed trade. Emails to club members now go out
          // exclusively through the explicit "Mark Filled (send email)"
          // flow (AdminTradeExecutedSection -> execute route ->
          // sendExecutionEmail), where an admin has actually reviewed and
          // attached proof. Push notifications stay as-is — lower-stakes,
          // and still useful as a live activity signal.
          await sendPushNotifications(tradePayload).catch(console.error);
        }
      }
      } catch (err) {
        console.error("[snapshot] change detection pass failed:", err);
      }

      // Each stage below is independently try/caught, so a throw in one
      // (most riskily the external FDV price lookup, or a push/email send)
      // can't skip the others. Proposal resolution/repost no longer lives
      // down here at all — it runs at the top of this function, ahead of the
      // cooldown check (see resolveExpiredProposals).

      // Programmatic Liquidation Policy check (resolved 2024-06-01 — see
      // lib/fdv.ts). Every school's non-ETH holdings with a real entryFdvUsd
      // (from the sheet's own Entry FDV column, or an admin's
      // positions.entry_fdv_usd override) get checked against their live
      // current FDV. Deduped via liquidation_alerts (unique on
      // school/ticker/alert_type — deliberately NOT investment_date, so a
      // position that crosses, dips back under, and crosses again later
      // still only ever alerts once per type) so each (school, ticker) only
      // ever fires each alert type once, ever — the insert itself is the
      // dedupe claim, so a conflict here (a real re-cross, or a race
      // against a concurrent cron run) skips the send rather than
      // double-emailing admins.
      try {
        const fdvTickers = new Set<string>();
        for (const s of schools) {
          for (const h of s.holdings ?? []) {
            if (h.ticker !== "ETH" && h.entryFdvUsd) fdvTickers.add(h.ticker);
          }
        }
        if (fdvTickers.size > 0) {
          const currentFdvByTicker = await getCurrentFdvForTickers([...fdvTickers]);
          for (const s of schools) {
            for (const h of s.holdings ?? []) {
              if (h.ticker === "ETH" || !h.entryFdvUsd) continue;
              const currentFdvUsd = currentFdvByTicker[h.ticker];
              if (!currentFdvUsd) continue;
              const result = checkLiquidationStatus(h.entryFdvUsd, currentFdvUsd);
              if (!result || result.status === "ok") continue;
              if (alreadyTrimmedForPolicy(s.exitedHoldings ?? [], h)) continue;

              const alertType = result.status === "crossed" ? "threshold_crossed" : "warning_90pct";
              const { error: alertInsertError } = await supabase.from("liquidation_alerts").insert({
                school: s.name,
                ticker: h.ticker,
                investment_date: h.investmentDate,
                alert_type: alertType,
                entry_fdv_usd: result.entryFdvUsd,
                current_fdv_usd: result.currentFdvUsd,
                multiple_target: result.multipleTarget,
              });
              if (alertInsertError) continue; // already sent this alert for this position

              await sendLiquidationAlertEmail({
                school: s.name,
                ticker: h.ticker,
                alertType,
                entryFdvUsd: result.entryFdvUsd,
                currentFdvUsd: result.currentFdvUsd,
                multipleTarget: result.multipleTarget,
                currentMultiple: result.currentMultiple,
                liquidationThresholdFdvUsd: result.liquidationThresholdFdvUsd,
              }).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("[snapshot] liquidation policy check failed:", err);
      }

      // Send 12-hour warning for proposals expiring within 13h that haven't been warned yet
      try {
        const in13h = new Date(Date.now() + 13 * 3600 * 1000).toISOString();
        const { data: warnProposals } = await supabase
          .from("proposals")
          .select("*")
          .eq("status", "active")
          .eq("deadline_warning_sent", false)
          .lt("voting_deadline", in13h)
          .gt("voting_deadline", new Date().toISOString());

        if (warnProposals && warnProposals.length > 0) {
          for (const proposal of warnProposals) {
            await supabase.from("proposals").update({ deadline_warning_sent: true }).eq("id", proposal.id);
            await send12HourWarningEmail(proposal as Proposal).catch(console.error);
          }
          console.log(`[snapshot] sent 12h warning for ${warnProposals.length} proposals`);
        }
      } catch (err) {
        console.error("[snapshot] 12h warning pass failed:", err);
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
    // Only the school History tab reads this; across every school the
    // full history is far too many rows to page through.
    if (!school) return NextResponse.json({ error: "school is required" }, { status: 400 });

    const supabase = createServiceClient();

    // Snapshots are hourly, so a school has thousands of rows. This used to
    // take the first 200 in ascending order, which cut every history chart
    // off at its first ~8 days (Purdue's ended 6/23). Read the whole history
    // in pages (light columns only), keep the last snapshot of each UTC day,
    // then load holdings just for those to get the ETH balance.
    type Row = { id: string; captured_at: string; school_name: string; nav_usd: number; eth_return_pct: number; usd_return_pct: number; deployed_pct: number };
    const rows: Row[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      let query = supabase
        .from("portfolio_snapshots")
        .select("id, captured_at, school_name, nav_usd, eth_return_pct, usd_return_pct, deployed_pct")
        // Skip snapshots taken during a failed upstream fetch (NAV 0).
        .gt("nav_usd", 0)
        .order("captured_at", { ascending: true })
        .range(from, from + PAGE - 1)
        .ilike("school_name", school);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rows.push(...((data ?? []) as Row[]));
      if (!data || data.length < PAGE) break;
    }

    // One point per UTC day. Some hourly snapshots were taken mid-outage —
    // ETH's live price missing (idle ETH valued at $0, so NAV halved and ETH
    // return read -100%, e.g. Purdue 9/29) or the ETH row missing from
    // holdings (ETH balance 0, Purdue 9/6). So per day: drop snapshots whose
    // NAV is >10% off that day's median, then take the latest one whose
    // holdings have a priced ETH balance.
    const byDay = new Map<string, Row[]>();
    for (const r of rows) {
      const day = r.captured_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(r);
    }
    const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
    const candidatesByDay = new Map<string, Row[]>();
    for (const [day, list] of byDay) {
      const med = median(list.map((r) => r.nav_usd));
      const sane = list.filter((r) => Math.abs(r.nav_usd - med) <= med * 0.1);
      // Latest first; a handful per day is enough to find a clean one.
      candidatesByDay.set(day, (sane.length ? sane : list).slice(-6).reverse());
    }

    // atCostUsd: value of tokens priced at exactly their purchase price
    // (0% ROI). When CoinGecko failed, every unquoted token fell back to
    // purchase price — fixed 2026-11-11, but snapshots from those stretches
    // overstate NAV (NYU 11/5–11/8, Columbia 8/25–9/1).
    type Eth = { tokens: number; priceUsd: number | null; atCostUsd: number };
    const ethById = new Map<string, Eth>();
    const ids = [...candidatesByDay.values()].flat().map((r) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await supabase
        .from("portfolio_snapshots")
        .select("id, holdings")
        .in("id", ids.slice(i, i + 100));
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      for (const row of data ?? []) {
        const holdings = (row.holdings ?? []) as Array<{ ticker: string; tokens: number; marketValueUsd?: number; roiUsdPct?: number }>;
        const eth = holdings.filter((h) => h.ticker === "ETH");
        const tokens = eth.reduce((sum, h) => sum + (h.tokens ?? 0), 0);
        const value = eth.reduce((sum, h) => sum + (h.marketValueUsd ?? 0), 0);
        const atCostUsd = holdings
          .filter((h) => h.ticker !== "ETH" && h.roiUsdPct === 0)
          .reduce((sum, h) => sum + (h.marketValueUsd ?? 0), 0);
        ethById.set(row.id, { tokens, priceUsd: tokens > 0 && value > 0 ? value / tokens : null, atCostUsd });
      }
    }

    // All-time ETH return is measured from the school's inception cohort
    // baseline (same as the leaderboard's All-Time view); season return from
    // this season's start NAV. Both from NAV and that day's ETH price, so the
    // lines are continuous across season rollovers — the stored
    // eth_return_pct resets at each season start.
    const schoolName = schoolNameFromSlug(slugify(school)) ?? school;
    const { subDaoOpeningYearByName } = await getSchoolsData();
    const inception = inceptionBaselineForYear(subDaoOpeningYearByName?.[schoolName] ?? null);
    const seasonBaseEth = SEASON_START_NAV_ETH[schoolName] ?? null;

    // Older snapshots don't store ETH's price, so fall back to CoinGecko's
    // daily ETH close for that date (one cached call covering the past year).
    const dailyEthUsd = new Map<string, number>();
    try {
      const res = await fetchCoinGecko(
        "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=365&interval=daily",
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const json = await res.json() as { prices?: [number, number][] };
        for (const [ms, usd] of json.prices ?? []) dailyEthUsd.set(new Date(ms).toISOString().slice(0, 10), usd);
      }
    } catch { /* fall through to carry-forward */ }

    // A school can legitimately hold a token with no live price (valued at
    // cost every day), so "at cost" only flags a snapshot when it's well
    // above that school's usual share.
    const costShare = (r: Row) => (ethById.get(r.id)?.atCostUsd ?? 0) / r.nav_usd;
    const allCands = [...candidatesByDay.values()].flat();
    const usualCostShare = allCands.length ? allCands.map(costShare).sort((a, b) => a - b)[Math.floor(allCands.length / 2)] : 0;
    const pricedOk = (r: Row) => costShare(r) <= usualCostShare + 0.05;

    let lastEthPrice: number | null = null;
    const days = [...candidatesByDay.keys()].sort().filter((day) => candidatesByDay.get(day)!.some(pricedOk));
    const picked = days.map((day) => {
      const cands = candidatesByDay.get(day)!.filter(pricedOk);
      const pick = cands.find((r) => { const e = ethById.get(r.id); return e && e.tokens > 0 && e.priceUsd != null; })
        ?? cands.find((r) => (ethById.get(r.id)?.tokens ?? 0) === 0 && r.deployed_pct < 99.9)
        ?? cands[0];
      const eth = ethById.get(pick.id);
      // A school holding no idle ETH has no ETH price in its own snapshot;
      // carry the last one seen forward.
      // CoinGecko's daily points sit at 00:00 UTC, i.e. the close of the
      // day before — so the next date's point is this day's close.
      const nextDay = new Date(Date.parse(day) + 86_400_000).toISOString().slice(0, 10);
      const ethPrice = eth?.priceUsd ?? dailyEthUsd.get(nextDay) ?? dailyEthUsd.get(day) ?? lastEthPrice;
      if (ethPrice) lastEthPrice = ethPrice;
      const navEth = ethPrice ? pick.nav_usd / ethPrice : null;
      return {
        ...pick,
        eth_balance: (eth?.tokens ?? 0) as number | null,
        all_time_eth_return_pct: navEth != null && inception && inception.ethAmount > 0
          ? ((navEth - inception.ethAmount) / inception.ethAmount) * 100
          : null,
        season_eth_return_pct: day >= SEASON_START_DATE
          ? (navEth != null && seasonBaseEth ? ((navEth - seasonBaseEth) / seasonBaseEth) * 100 : pick.eth_return_pct)
          : null,
      };
    });

    // Then check each day against the week around it. A day whose NAV is
    // >8% off the 7-day median, or whose All-Time ETH return is >8 points
    // off it, is a glitch (a bad ETH price, a failed fetch), not a move — a
    // real move that holds pulls the median with it and isn't touched. A NAV
    // identical to the day before means data collection was paused and the
    // same figure was re-saved, so those repeats are dropped too.
    const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const snapshots = picked.filter((cur, i) => {
      if (i > 0 && cur.nav_usd === picked[i - 1].nav_usd) return false;
      const win = picked.slice(Math.max(0, i - 3), i + 4);
      const navMed = med(win.map((r) => r.nav_usd));
      if (Math.abs(cur.nav_usd - navMed) > navMed * 0.08) return false;
      const rets = win.map((r) => r.all_time_eth_return_pct).filter((v): v is number => v != null);
      if (cur.all_time_eth_return_pct != null && rets.length && Math.abs(cur.all_time_eth_return_pct - med(rets)) > 8) return false;
      return true;
    });
    // An ETH balance of 0 between two days that have ETH is a snapshot
    // missing its ETH row (Purdue 9/6) — blank it rather than plot 0.
    snapshots.forEach((cur, i) => {
      const prev = snapshots[i - 1], next = snapshots[i + 1];
      if (prev && next && cur.eth_balance === 0 && (prev.eth_balance ?? 0) > 0 && (next.eth_balance ?? 0) > 0) cur.eth_balance = null;
    });

    return NextResponse.json({ snapshots, seasonStart: SEASON_START_DATE }, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
