import { createServiceClient } from "@/lib/supabase/server";
import { getSchoolsData } from "@/lib/cache";
import { buildTemplate, escapeHtml, APP_URL } from "@/lib/email";
import { mergeHoldingsByTicker, parseDateMsAsc } from "@/lib/holdings";
import { schoolDisplayName } from "@/lib/schoolData";
import { SEASON_START_DATE, SEASON_START_NAV_USD } from "@/lib/seasonBaseline";
import { getScaledTokenSeasonPerformance } from "@/lib/seasonPerformance";
import {
  getMonthStartDate, getPortfolioMonthToDateReturn, getPortfolioWindowReturn, getPositionMonthToDateReturns,
} from "@/lib/snapshotReturns";
import type { Holding } from "@/lib/types";

// The two monthly report emails — per-school Portfolio Report and the
// DormDAO-wide Leaderboard Digest — built from the same live data the site
// shows (getSchoolsData, the 26-27 season baseline, and the daily
// portfolio_snapshots history for Month-to-Date). Ported from the
// "Portfolio Report Email" / "Leaderboard Digest Email" design previews,
// minus their illustrative placeholder figures and internal notes.
//
// Preview-only for now: rendered in the admin Email Functions page via
// /api/admin/report-emails/preview. Nothing here sends anything.

export interface BuiltEmail {
  subject: string;
  html: string;
}

const GREEN = "#1D9E75";
const RED = "#ef4444";
const MUTED = "#9ca3af";

// ── Formatting ───────────────────────────────────────────────────────────────

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function signedUsd(n: number): string {
  return `${n >= 0 ? "+" : "-"}${usd(Math.abs(n))}`;
}

function signedPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function tone(n: number): string {
  return n >= 0 ? GREEN : RED;
}

function fmtDate(d: Date | number): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Sheet investment dates are y/m/d (or y-m-d) strings — parsed the same way
// the rest of the site parses them.
function investmentMs(h: Pick<Holding, "investmentDate">): number | null {
  const ms = parseDateMsAsc(h.investmentDate);
  return Number.isFinite(ms) ? ms : null;
}

const cell = "padding:10px;border-bottom:1px solid #f0f0f0";
const numCell = `${cell};text-align:right;font-family:ui-monospace,monospace;font-size:12px`;
const th = (align: "left" | "right" | "center") =>
  `padding:8px 10px;text-align:${align};font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;white-space:nowrap`;
const h3 = (margin: string) =>
  `<h3 style="font-size:13px;font-weight:700;color:#111827;margin:${margin}">`;
const footnote = (text: string) =>
  `<p style="font-size:10px;color:${MUTED};margin:8px 0 0;line-height:1.5">${text}</p>`;

// A gain/ROI pair cell — dollar change on top, ETH-relative % below.
function returnCell(gainUsd: number | null | undefined, roiEthPct: number | null | undefined): string {
  if (gainUsd == null) return `<td style="${numCell};color:${MUTED}">—</td>`;
  const pctLine = roiEthPct == null
    ? ""
    : `<div style="font-size:10px;font-weight:400;white-space:nowrap">${signedPct(roiEthPct)} vs ETH</div>`;
  return `<td style="${numCell};font-weight:600;color:${tone(gainUsd)};white-space:nowrap">${signedUsd(gainUsd)}${pctLine}</td>`;
}

function statBox(label: string, value: string, sub: string, color = "#111827"): string {
  return `<td style="width:33.33%;padding:10px 8px;vertical-align:top">
    <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${label}</div>
    <div style="font-size:14px;font-weight:700;font-family:ui-monospace,monospace;color:${color}">${value}</div>
    <div style="font-size:10px;color:${MUTED};margin-top:2px">${sub}</div>
  </td>`;
}

function returnLine(label: string, range: string, pct: number | null | undefined, first = false): string {
  const value = pct == null
    ? `<strong style="color:${MUTED}">—</strong>`
    : `<strong style="color:${tone(pct)}">${signedPct(pct)}</strong>`;
  return `<div style="font-size:13px;color:#6b7280;${first ? "" : "margin-top:6px"}">${label} <span style="font-size:11px;color:#b0b5bc">(${range})</span> ${value}</div>`;
}

// ── Monthly Portfolio Report (one per school) ────────────────────────────────

export async function buildPortfolioReportEmail(slug: string, now: Date = new Date()): Promise<BuiltEmail | null> {
  const { schools, sinceInceptionSchools } = await getSchoolsData();
  const school = schools.find((s) => s.slug === slug);
  if (!school) return null;

  const label = schoolDisplayName(school.name);
  const merged = mergeHoldingsByTicker(school.holdings ?? []);
  const nfts = mergeHoldingsByTicker(school.nftHoldings ?? []);
  const ethHolding = merged.find((h) => h.ticker === "ETH");
  const ethPriceUsd = ethHolding?.tokens ? (ethHolding.marketValueUsd ?? 0) / ethHolding.tokens : 0;
  const positions = [...merged.filter((h) => h.ticker !== "ETH"), ...nfts]
    .sort((a, b) => (b.marketValueUsd ?? 0) - (a.marketValueUsd ?? 0));

  const monthStartIso = getMonthStartDate(now);
  const monthStartMs = new Date(monthStartIso).getTime();

  const service = createServiceClient();
  const [mtd, mtdByTicker, season, { data: changeRows }] = await Promise.all([
    getPortfolioMonthToDateReturn(school.name, school.nav, ethPriceUsd),
    getPositionMonthToDateReturns(school.name, ethPriceUsd, positions),
    getScaledTokenSeasonPerformance(
      school.name, SEASON_START_NAV_USD[school.name], ethPriceUsd, [...merged, ...nfts], school.exitedHoldings ?? [],
    ),
    service
      .from("portfolio_changes")
      .select("change_type, token_ticker, detected_at")
      .eq("school_name", school.name)
      .order("detected_at", { ascending: false })
      .limit(3),
  ]);
  const inception = sinceInceptionSchools.find((s) => s.name === school.name);

  const monthRange = `${fmtDate(monthStartMs)}–${fmtDate(now)}`;
  const seasonRange = `${fmtDate(new Date(`${SEASON_START_DATE}T00:00:00Z`))}–${fmtDate(now)}`;

  // ── Headline numbers
  const headline = `
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;margin-bottom:20px">
    <tr>
      <td style="width:50%;padding:14px 16px;vertical-align:top">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">NAV</div>
        <div style="font-size:20px;font-weight:700;font-family:ui-monospace,monospace;color:#111827">${usd(school.nav)}</div>
      </td>
      <td style="width:50%;padding:14px 16px;vertical-align:top">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">% Deployed</div>
        <div style="font-size:20px;font-weight:700;font-family:ui-monospace,monospace;color:#111827">${school.pctDeployed.toFixed(1)}%</div>
      </td>
    </tr>
    <tr style="border-top:1px solid #e5e7eb">
      <td colspan="2" style="padding:14px 16px;vertical-align:top;border-top:1px solid #e5e7eb">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Performance vs USD</div>
        ${returnLine("Month-to-Date", monthRange, mtd?.usdReturnPct, true)}
        ${returnLine("Current Season", seasonRange, school.usdReturn)}
        ${returnLine("Since Inception", `through ${fmtDate(now)}`, inception?.usdReturn)}
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:14px 16px;vertical-align:top;border-top:1px solid #e5e7eb">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Performance vs ETH</div>
        ${returnLine("Month-to-Date", monthRange, mtd?.ethReturnPct, true)}
        ${returnLine("Current Season", seasonRange, school.ethReturn)}
        ${returnLine("Since Inception", `through ${fmtDate(now)}`, inception?.ethReturn)}
      </td>
    </tr>
  </table>`;

  // ── Positions table
  const ethRow = ethHolding ? `
      <tr style="background:#eef5f0">
        <td style="${cell};white-space:nowrap">
          <div style="font-family:ui-monospace,monospace;font-weight:700;font-size:13px;color:#111827">$ETH Treasury</div>
          <div style="font-size:10px;color:${MUTED}">Idle balance</div>
        </td>
        <td style="${numCell};color:${MUTED}">—</td>
        <td style="${numCell};color:#374151">${usd(ethHolding.marketValueUsd ?? 0)}</td>
        <td style="${numCell};color:${MUTED}">—</td>
        <td style="${numCell};color:${MUTED}">—</td>
        <td style="${numCell};color:${MUTED}">—</td>
      </tr>` : "";

  const positionRows = positions.map((h, i) => {
    const boughtMs = investmentMs(h);
    const seasonRow = season.rows[h.ticker];
    // A position opened during the window has no baseline to diff against —
    // its since-purchase figures ARE its window figures.
    const mtdRow = mtdByTicker[h.ticker];
    const mtdGain = mtdRow ? mtdRow.gainUsd : boughtMs != null && boughtMs >= monthStartMs ? h.gainUsd : null;
    const mtdEth = mtdRow ? mtdRow.roiEthPct : boughtMs != null && boughtMs >= monthStartMs ? h.roiEthPct : null;
    const sub = h.blockchain ? escapeHtml(h.blockchain) : "";
    return `
      <tr style="background:${i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="${cell}">
          <div style="font-family:ui-monospace,monospace;font-weight:700;font-size:13px;color:#111827;white-space:nowrap">$${escapeHtml(h.ticker)}</div>
          ${sub ? `<div style="font-size:10px;color:${MUTED}">${sub}</div>` : ""}
        </td>
        <td style="${numCell};color:#374151;white-space:nowrap">${h.costBasisEth.toFixed(2)} ETH</td>
        <td style="${numCell};color:#374151">${usd(h.marketValueUsd ?? 0)}</td>
        ${returnCell(h.gainUsd, h.roiEthPct)}
        ${returnCell(seasonRow?.gainUsd, seasonRow?.roiEthPct)}
        ${returnCell(mtdGain, mtdEth)}
      </tr>`;
  }).join("");

  const positionsTable = `
  ${h3("0 0 4px")}Active Positions</h3>
  <table style="width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="background:#f9fafb">
      <th style="${th("left")}">Token</th>
      <th style="${th("right")}">Cost</th>
      <th style="${th("right")}">Value</th>
      <th style="${th("right")}">Since Purchase</th>
      <th style="${th("right")}">Season</th>
      <th style="${th("right")}">MTD</th>
    </tr></thead>
    <tbody>${ethRow}${positionRows}</tbody>
  </table>
  ${footnote(`Since Purchase is each position's return since it was opened. Season is since ${fmtDate(new Date(`${SEASON_START_DATE}T00:00:00Z`))} and MTD since ${fmtDate(monthStartMs)} — for a position opened after those dates, they equal its since-purchase return. Percentages are measured against holding ETH.`)}`;

  // ── Insights
  const withRoi = positions.filter((h) => h.roiEthPct != null);
  const beatEth = withRoi.filter((h) => (h.roiEthPct ?? 0) > 0).length;
  const winRate = withRoi.length ? Math.round((beatEth / withRoi.length) * 100) : null;
  const byRoi = [...withRoi].sort((a, b) => (b.roiEthPct ?? 0) - (a.roiEthPct ?? 0));
  const best = byRoi[0];
  const worst = byRoi[byRoi.length - 1];
  const largest = positions[0];
  const smallest = positions[positions.length - 1];
  const ages = positions.map(investmentMs).filter((ms): ms is number => ms != null).map((ms) => (now.getTime() - ms) / 86_400_000);
  const avgAge = ages.length ? Math.round(ages.reduce((s, d) => s + d, 0) / ages.length) : null;
  const avgSize = positions.length ? positions.reduce((s, h) => s + (h.marketValueUsd ?? 0), 0) / positions.length : null;
  const pctOfNav = (h: Holding | undefined) =>
    h && school.nav > 0 ? `${(((h.marketValueUsd ?? 0) / school.nav) * 100).toFixed(1)}% of NAV` : "—";
  const bestWorstSub = (h: Holding | undefined) =>
    h ? `${signedPct(h.roiEthPct ?? 0)} vs ETH · ${signedUsd(h.gainUsd ?? 0)}` : "—";

  const changes = (changeRows ?? []) as Array<{ change_type: string; token_ticker: string; detected_at: string }>;
  const changesHtml = changes.length === 0 ? "" : `
  <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0">
    <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Most Recent Portfolio Updates</div>
    ${changes.map((c) => {
      const isBuy = c.change_type === "buy" || c.change_type === "increase";
      const bg = isBuy ? "#e6f7ef" : "#fdecec";
      const fg = isBuy ? GREEN : RED;
      return `<div style="margin-bottom:4px;font-size:12px"><span style="font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 6px;border-radius:4px;background:${bg};color:${fg}">${escapeHtml(c.change_type)}</span> <span style="font-family:ui-monospace,monospace;font-weight:600;color:#111827">$${escapeHtml(c.token_ticker)}</span> <span style="color:${MUTED}">· ${fmtDate(new Date(c.detected_at))}</span></div>`;
    }).join("")}
  </div>`;

  const insights = `
  ${h3("24px 0 4px")}Portfolio Insights</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr>
      ${statBox("Positions", String(positions.length), "active holdings")}
      ${statBox("Rank", `#${school.rank}`, "by season ETH return", GREEN)}
      ${statBox("Avg Position Age", avgAge != null ? `${avgAge}d` : "—", avgAge != null ? `~${(avgAge / 30.4).toFixed(1)} months` : "")}
    </tr>
    <tr>
      ${statBox("Largest Position", largest ? `$${escapeHtml(largest.ticker)}` : "—", pctOfNav(largest))}
      ${statBox("Smallest Position", smallest ? `$${escapeHtml(smallest.ticker)}` : "—", pctOfNav(smallest))}
      ${statBox("Avg Position Size", avgSize != null ? usd(avgSize) : "—", "per holding")}
    </tr>
    <tr>
      ${statBox("Win Rate vs ETH", winRate != null ? `${winRate}%` : "—", `${beatEth}/${withRoi.length} beat ETH`, winRate != null && winRate >= 50 ? GREEN : RED)}
      ${statBox("Best Position", best ? `$${escapeHtml(best.ticker)}` : "—", bestWorstSub(best), GREEN)}
      ${statBox("Worst Position", worst ? `$${escapeHtml(worst.ticker)}` : "—", bestWorstSub(worst), RED)}
    </tr>
  </table>
  ${changesHtml}`;

  const dashboardUrl = `${APP_URL}/schools/${school.slug}`;
  const bodyHtml = `
  <p style="font-size:12px;color:#6b7280;margin:-8px 0 16px">${monthLabel(now)} · Season 2026–27 · As of ${fmtDate(now)}</p>
  <p style="margin:0 0 20px"><a href="${dashboardUrl}" style="display:inline-block;padding:10px 22px;background:${GREEN};color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">View Full Portfolio Dashboard &rarr;</a></p>
  ${headline}
  ${positionsTable}
  ${insights}`;

  return {
    subject: `Your Monthly Portfolio Report — ${label} — ${monthLabel(now)}`,
    html: buildTemplate({
      title: "Your Monthly Portfolio Report",
      schoolLabel: escapeHtml(label),
      schoolSlug: school.slug,
      titleIcon: true,
      bodyHtml,
      maxWidth: 680,
    }),
  };
}

// ── Monthly Leaderboard Digest (DormDAO-wide) ────────────────────────────────
//
// Kept deliberately short (per Zack's review): a portfolio snapshot, two
// leaderboards on different timeframes — Past Month on top, Season-to-Date
// as the "Performance Leaderboard" bar chart — and the positions opened this
// month. No since-inception figures anywhere in the digest.
//
// Stays in review until Jack signs off: `review` on the result lists every
// open item (missing disclosure, schools without a month baseline, opened
// positions the snapshot history disagrees on) and the admin preview shows
// it above the email. These changes are digest-only — the school Portfolio
// Report above is unaffected.

// Approved disclosure text for the digest footer, as HTML. Deliberately
// null: no approved wording exists in the codebase or the design previews,
// and it must come from whoever signs off on legal language — not be
// written here. While it's null the email shows a visible placeholder and
// the review list flags it, so the digest can't look finished without it.
const DIGEST_DISCLOSURE_HTML: string | null = null;

export interface ReviewStatus {
  status: "in_review";
  flags: string[];
}

export interface BuiltDigest extends BuiltEmail {
  review: ReviewStatus;
}

export async function buildLeaderboardDigestEmail(now: Date = new Date()): Promise<BuiltDigest> {
  const { schools, totalNAV, avgEthReturn, avgUsdReturn, avgDeployed } = await getSchoolsData();
  const seasonRanked = [...schools].sort((a, b) => a.rank - b.rank);
  const flags: string[] = [];

  const monthStartIso = getMonthStartDate(now);
  const monthStartMs = new Date(monthStartIso).getTime();
  const nowMs = now.getTime();
  const monthRange = `${fmtDate(monthStartMs)} – ${fmtDate(now)}`;
  const seasonRange = `${fmtDate(new Date(`${SEASON_START_DATE}T00:00:00Z`))} – ${fmtDate(now)}`;

  // One ETH price for the whole DAO, read off the first school's ETH treasury
  // holding — the same marketValueUsd / tokens derivation the school report
  // uses, but not dependent on any one school holding ETH.
  let ethPriceUsd = 0;
  for (const s of schools) {
    const eth = mergeHoldingsByTicker(s.holdings ?? []).find((h) => h.ticker === "ETH");
    if (eth?.tokens && eth.marketValueUsd) { ethPriceUsd = eth.marketValueUsd / eth.tokens; break; }
  }
  if (!ethPriceUsd) flags.push("No ETH price could be derived from any school's ETH holding, so past-month ETH returns are blank.");

  const service = createServiceClient();
  const [monthReturns, { data: buyRows }] = await Promise.all([
    Promise.all(schools.map((s) => ethPriceUsd
      ? getPortfolioWindowReturn(s.name, monthStartIso, s.nav, ethPriceUsd)
      : Promise.resolve(null))),
    service
      .from("portfolio_changes")
      .select("school_name, token_ticker, detected_at")
      .eq("change_type", "buy")
      .gte("detected_at", monthStartIso)
      .lte("detected_at", now.toISOString()),
  ]);

  // ── Accuracy cross-checks (shown to the reviewer, never in the email)
  const navSum = schools.reduce((sum, s) => sum + s.nav, 0);
  if (Math.abs(navSum - totalNAV) > 1) {
    flags.push(`DormDAO NAV (${usd(totalNAV)}) doesn't equal the sum of school NAVs (${usd(navSum)}).`);
  }
  const monthBy = new Map(schools.map((s, i) => [s.name, monthReturns[i]]));
  const noBaseline = schools.filter((s) => !monthBy.get(s.name)).map((s) => schoolDisplayName(s.name));
  if (noBaseline.length > 0) {
    flags.push(`No snapshot at or after ${fmtDate(monthStartMs)} for ${noBaseline.join(", ")}, so they're unranked in Past Month.`);
  }
  const lateBaseline = schools
    .map((s) => ({ s, r: monthBy.get(s.name) }))
    .filter((x) => x.r && new Date(x.r.baselineCapturedAt).getTime() - monthStartMs > 36 * 3_600_000)
    .map((x) => `${schoolDisplayName(x.s.name)} (${fmtDate(new Date(x.r!.baselineCapturedAt))})`);
  if (lateBaseline.length > 0) {
    flags.push(`Past Month baseline is a late snapshot, not the 1st, for: ${lateBaseline.join(", ")}.`);
  }

  // ── Portfolio snapshot
  const kpi = (labelText: string, value: string, sub: string) => `
      <td style="width:25%;padding:14px 10px;text-align:center;vertical-align:top">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${labelText}</div>
        <div style="font-size:18px;font-weight:700;color:#111827;font-family:ui-monospace,monospace">${value}</div>
        <div style="font-size:10px;color:${MUTED};margin-top:3px">${sub}</div>
      </td>`;
  const snapshot = `
  ${h3("18px 0 0")}Portfolio Snapshot</h3>
  <table style="width:100%;border-collapse:collapse;margin-top:10px;border:1px solid #e5e7eb">
    <tr>
      ${kpi("DormDAO NAV", usd(totalNAV), `${schools.length} schools`)}
      ${kpi("Avg ETH Return", signedPct(avgEthReturn), "Season to date")}
      ${kpi("Avg USD Return", signedPct(avgUsdReturn), "Season to date")}
      ${kpi("Avg Deployed", `${avgDeployed.toFixed(1)}%`, "Of NAV, today")}
    </tr>
  </table>`;

  // ── Past Month leaderboard (top)
  const monthRanked = schools
    .map((s) => ({ s, r: monthBy.get(s.name) ?? null }))
    .sort((a, b) => {
      if (a.r && b.r) return b.r.ethReturnPct - a.r.ethReturnPct;
      if (a.r) return -1;
      if (b.r) return 1;
      return a.s.rank - b.s.rank;
    });
  const pctCell = (v: number | null | undefined, bold = false) => v == null
    ? `<td style="${numCell};color:${MUTED}">—</td>`
    : `<td style="${numCell};color:${tone(v)};white-space:nowrap${bold ? ";font-weight:700" : ""}">${signedPct(v)}</td>`;
  const monthRows = monthRanked.map(({ s, r }, i) => `
      <tr style="background:${r && i < 3 ? "#f0fbf6" : i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="${cell};font-family:ui-monospace,monospace;font-weight:700;font-size:12px;color:${r && i < 3 ? "#111827" : MUTED};text-align:center">${r ? i + 1 : "—"}</td>
        <td style="${cell};font-size:12.5px;font-weight:600;color:#111827">${escapeHtml(schoolDisplayName(s.name))}</td>
        ${pctCell(r?.ethReturnPct, true)}
        ${pctCell(r?.usdReturnPct)}
      </tr>`).join("");
  const monthBoard = `
  ${h3("26px 0 0")}Past Month Leaderboard <span style="font-weight:400;color:${MUTED};font-size:11px">${monthRange}</span></h3>
  <table style="width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="background:#f9fafb">
      <th style="${th("center")}">Rank</th>
      <th style="${th("left")}">School</th>
      <th style="${th("right")}">ETH Return</th>
      <th style="${th("right")}">USD Return</th>
    </tr></thead>
    <tbody>${monthRows}</tbody>
  </table>
  ${footnote(`Ranked by ETH return over ${monthRange} — each school's NAV today against its first snapshot of the month.${noBaseline.length ? " Schools without a snapshot for that date show — and aren't ranked." : ""}`)}`;

  // ── Performance Leaderboard (Season to date): ETH return as diverging
  // bars — positive grows right of center, negative left, scaled to the
  // largest absolute return on the board, so the size of a lead is visible —
  // with USD Return and % Deployed beside it: the other two metrics this
  // digest has always carried per school (same columns as the dashboard
  // leaderboard). Nested tables, not flex/grid — email clients (Outlook
  // especially) don't support them.
  const maxAbs = Math.max(1, ...seasonRanked.map((s) => Math.abs(s.ethReturn)));
  const barRows = seasonRanked.map((s, i) => {
    const w = ((Math.abs(s.ethReturn) / maxAbs) * 100).toFixed(1);
    const bar = (side: "left" | "right") =>
      `<div style="height:14px;width:${w}%;background:${side === "right" ? GREEN : RED};${side === "right" ? "border-radius:0 3px 3px 0" : "border-radius:3px 0 0 3px;margin-left:auto"}"></div>`;
    const leftCell = s.ethReturn < 0 ? bar("left") : "";
    const rightCell = s.ethReturn >= 0 ? bar("right") : "";
    const side = "padding:5px 8px;text-align:right;font-family:ui-monospace,monospace;font-size:11px;white-space:nowrap;width:1%";
    return `
      <tr style="background:${i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="padding:5px 8px;font-size:11px;color:#374151;white-space:nowrap;width:1%">${escapeHtml(schoolDisplayName(s.name))}</td>
        <td style="padding:5px 4px">
          <table style="width:100%;border-collapse:collapse"><tr>
            <td style="width:50%;padding:0;border-right:1px solid #d1d5db">${leftCell}</td>
            <td style="width:50%;padding:0">${rightCell}</td>
          </tr></table>
        </td>
        <td style="${side};font-weight:700;color:${tone(s.ethReturn)}">${signedPct(s.ethReturn)}</td>
        <td style="${side};color:${tone(s.usdReturn)}">${signedPct(s.usdReturn)}</td>
        <td style="${side};color:#374151">${s.pctDeployed.toFixed(1)}%</td>
      </tr>`;
  }).join("");
  const chartTh = (align: "left" | "right" | "center") => `${th(align)};padding:6px 8px`;
  const chart = `
  ${h3("26px 0 0")}Performance Leaderboard <span style="font-weight:400;color:${MUTED};font-size:11px">Season to date · ${seasonRange}</span></h3>
  <table style="width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="background:#f9fafb">
      <th style="${chartTh("left")}">School</th>
      <th style="${chartTh("center")}">ETH Return</th>
      <th style="${chartTh("right")}">ETH</th>
      <th style="${chartTh("right")}">USD</th>
      <th style="${chartTh("right")}">Deployed</th>
    </tr></thead>
    ${barRows}
  </table>
  ${footnote("Ranked by season ETH return, the same as the dashboard leaderboard. Green bars run right for gains, red bars left for losses, scaled to the largest move on the board. Deployed is the share of NAV held outside the ETH treasury today.")}`;

  // ── Positions opened this month: a ticker whose earliest tranche falls in
  // the window. Adds to a position a school already held don't count.
  type Opened = { school: (typeof schools)[number]; h: Holding; ms: number };
  const opened: Opened[] = [];
  let undated = 0;
  for (const s of schools) {
    const tranches = [...(s.holdings ?? []), ...(s.nftHoldings ?? [])].filter((h) => h.ticker !== "ETH");
    const firstBuy = new Map<string, number>();
    for (const h of tranches) {
      const ms = investmentMs(h);
      if (ms == null) { undated++; continue; }
      firstBuy.set(h.ticker, Math.min(firstBuy.get(h.ticker) ?? Infinity, ms));
    }
    for (const h of mergeHoldingsByTicker(tranches)) {
      const ms = firstBuy.get(h.ticker);
      if (ms != null && ms >= monthStartMs && ms <= nowMs) opened.push({ school: s, h, ms });
    }
  }
  opened.sort((a, b) => b.ms - a.ms);
  if (undated > 0) flags.push(`${undated} holding tranche(s) have no readable investment date, so they can't be checked for "opened this month".`);

  // Cross-check against the buys the hourly snapshot diff detected.
  const key = (school: string, ticker: string) => `${school}|${ticker.toUpperCase()}`;
  const sheetKeys = new Set(opened.map((o) => key(o.school.name, o.h.ticker)));
  const detectedKeys = new Set(((buyRows ?? []) as Array<{ school_name: string; token_ticker: string }>)
    .map((r) => key(r.school_name, r.token_ticker)));
  const pretty = (k: string) => { const [school, t] = k.split("|"); return `${schoolDisplayName(school)} $${t}`; };
  const onlySheet = [...sheetKeys].filter((k) => !detectedKeys.has(k)).map(pretty);
  const onlyDetected = [...detectedKeys].filter((k) => !sheetKeys.has(k)).map(pretty);
  if (onlySheet.length) flags.push(`Listed as opened (by investment date) but no matching buy detected in snapshots: ${onlySheet.join(", ")}.`);
  if (onlyDetected.length) flags.push(`Buy detected in snapshots this month but not listed (investment date is earlier, or the position is already closed): ${onlyDetected.join(", ")}.`);

  const openedRows = opened.map((r, i) => `
      <tr style="background:${i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="${cell};font-size:12px;color:#374151">${escapeHtml(schoolDisplayName(r.school.name))}</td>
        <td style="${cell};font-family:ui-monospace,monospace;font-weight:700;font-size:12.5px;color:#111827">$${escapeHtml(r.h.ticker)}</td>
        <td style="${cell};font-size:11px;color:#6b7280;white-space:nowrap">${fmtDate(r.ms)}</td>
        <td style="${numCell};color:#374151">${r.h.marketValueUsd == null ? "—" : usd(r.h.marketValueUsd)}</td>
        ${pctCell(r.h.roiEthPct, true)}
      </tr>`).join("");
  const newPositions = `
  ${h3("26px 0 0")}Positions Opened <span style="font-weight:400;color:${MUTED};font-size:11px">${monthRange}</span></h3>
  ${opened.length === 0
    ? `<p style="font-size:12px;color:#6b7280;margin:10px 0 0">No new positions opened across DormDAO this month.</p>`
    : `<table style="width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="background:#f9fafb">
      <th style="${th("left")}">School</th>
      <th style="${th("left")}">Token</th>
      <th style="${th("left")}">Opened</th>
      <th style="${th("right")}">Value</th>
      <th style="${th("right")}">vs ETH</th>
    </tr></thead>
    <tbody>${openedRows}</tbody>
  </table>
  ${footnote(`New positions only — adds to positions a school already held aren't listed. "vs ETH" is the return since purchase, measured against holding ETH.`)}`}`;

  // ── Disclosure
  if (!DIGEST_DISCLOSURE_HTML) {
    flags.unshift("Disclosure text is missing. Add the approved wording to DIGEST_DISCLOSURE_HTML in lib/report-emails.ts before this can send.");
  }
  const disclosure = DIGEST_DISCLOSURE_HTML
    ? `<div style="margin-top:22px;padding-top:12px;border-top:1px solid #f0f0f0;font-size:10px;color:${MUTED};line-height:1.5">${DIGEST_DISCLOSURE_HTML}</div>`
    : `<div style="margin-top:22px;padding:10px 12px;border:1px dashed #f59e0b;background:#fffbeb;border-radius:6px;font-size:11px;color:#92400e;line-height:1.5"><strong>Disclosure — awaiting approved text.</strong> This placeholder must be replaced before the digest is sent.</div>`;

  const bodyHtml = `
  <p style="font-size:12.5px;color:${MUTED};margin:-8px 0 4px">${monthLabel(now)} · Season 2026–27 · As of ${fmtDate(now)}</p>
  ${snapshot}
  ${monthBoard}
  ${chart}
  ${newPositions}
  ${disclosure}`;

  return {
    subject: `DormDAO Leaderboard Digest — ${monthLabel(now)}`,
    html: buildTemplate({
      title: "Leaderboard Digest",
      schoolLabel: "DormDAO · All Schools",
      titleIcon: true,
      bodyHtml,
      cta: { label: "View Full DormDAO Leaderboard →", url: `${APP_URL}/leaderboard` },
      maxWidth: 680,
    }),
    review: { status: "in_review", flags },
  };
}
