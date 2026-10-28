import { createServiceClient } from "@/lib/supabase/server";
import { getSchoolsData } from "@/lib/cache";
import { buildTemplate, escapeHtml, APP_URL } from "@/lib/email";
import { mergeHoldingsByTicker, parseDateMsAsc } from "@/lib/holdings";
import { schoolDisplayName } from "@/lib/schoolData";
import { SEASON_START_DATE, SEASON_START_NAV_USD } from "@/lib/seasonBaseline";
import { getScaledTokenSeasonPerformance } from "@/lib/seasonPerformance";
import {
  getMonthStartDate, getPortfolioMonthToDateReturn, getPositionMonthToDateReturns,
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

export async function buildLeaderboardDigestEmail(now: Date = new Date()): Promise<BuiltEmail> {
  const { schools, totalNAV, avgEthReturn, avgUsdReturn, avgDeployed } = await getSchoolsData();
  const ranked = [...schools].sort((a, b) => a.rank - b.rank);

  const kpi = (labelText: string, value: string) => `
      <td style="width:25%;padding:14px 10px;text-align:center;vertical-align:top">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${labelText}</div>
        <div style="font-size:18px;font-weight:700;color:#111827;font-family:ui-monospace,monospace">${value}</div>
      </td>`;
  const kpis = `
  <table style="width:100%;border-collapse:collapse;margin-top:14px;border:1px solid #e5e7eb">
    <tr>
      ${kpi("DormDAO NAV", usd(totalNAV))}
      ${kpi("Avg ETH Return", signedPct(avgEthReturn))}
      ${kpi("Avg USD Return", signedPct(avgUsdReturn))}
      ${kpi("Avg Deployed", `${avgDeployed.toFixed(1)}%`)}
    </tr>
  </table>`;

  const leaderRows = ranked.map((s, i) => `
      <tr style="background:${i < 3 ? "#f0fbf6" : i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;font-family:ui-monospace,monospace;font-weight:700;font-size:12px;color:${i < 3 ? "#111827" : MUTED};text-align:center">${s.rank}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;font-size:12.5px;font-weight:600;color:#111827">${escapeHtml(schoolDisplayName(s.name))}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-family:ui-monospace,monospace;font-size:12px;font-weight:700;color:${tone(s.ethReturn)};white-space:nowrap">${signedPct(s.ethReturn)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-family:ui-monospace,monospace;font-size:12px;color:${tone(s.usdReturn)};white-space:nowrap">${signedPct(s.usdReturn)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-family:ui-monospace,monospace;font-size:12px;color:#374151;white-space:nowrap">${s.pctDeployed.toFixed(1)}%</td>
      </tr>`).join("");

  const leaderboard = `
  ${h3("26px 0 0")}Leaderboard</h3>
  <table style="width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="background:#f9fafb">
      <th style="${th("center")}">Rank</th>
      <th style="${th("left")}">School</th>
      <th style="${th("right")}">ETH Return</th>
      <th style="${th("right")}">USD Return</th>
      <th style="${th("right")}">Deployed</th>
    </tr></thead>
    <tbody>${leaderRows}</tbody>
  </table>
  ${footnote("Ranked by current-season ETH return, the same as the dashboard leaderboard. Season returns are since Oct 1, 2026.")}`;

  // Diverging bars: positive returns grow right of center, negative left,
  // scaled to the largest absolute return on the board. Nested tables, not
  // flex/grid — email clients (Outlook especially) don't support them.
  const maxAbs = Math.max(1, ...ranked.map((s) => Math.abs(s.ethReturn)));
  const barRows = ranked.map((s, i) => {
    const w = ((Math.abs(s.ethReturn) / maxAbs) * 100).toFixed(1);
    const bar = (side: "left" | "right") =>
      `<div style="height:14px;width:${w}%;background:${side === "right" ? GREEN : RED};${side === "right" ? "border-radius:0 3px 3px 0" : "border-radius:3px 0 0 3px;margin-left:auto"}"></div>`;
    const leftCell = s.ethReturn < 0 ? bar("left") : "";
    const rightCell = s.ethReturn >= 0 ? bar("right") : "";
    return `
      <tr style="background:${i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="padding:5px 8px;font-size:11px;color:#374151;white-space:nowrap;width:1%">${escapeHtml(schoolDisplayName(s.name))}</td>
        <td style="padding:5px 4px">
          <table style="width:100%;border-collapse:collapse"><tr>
            <td style="width:50%;padding:0;border-right:1px solid #d1d5db">${leftCell}</td>
            <td style="width:50%;padding:0">${rightCell}</td>
          </tr></table>
        </td>
        <td style="padding:5px 8px;text-align:right;font-family:ui-monospace,monospace;font-size:11px;font-weight:700;color:${tone(s.ethReturn)};white-space:nowrap;width:1%">${signedPct(s.ethReturn)}</td>
      </tr>`;
  }).join("");
  const chart = `
  ${h3("26px 0 0")}Cross-School Performance</h3>
  <table style="width:100%;border-collapse:collapse;margin-top:10px">${barRows}</table>
  ${footnote("Current-season ETH return by school — green bars run right for positive returns, red bars left for negative, scaled to the largest move on the board.")}`;

  // Every tranche bought in the last 30 days, across all schools.
  const windowStartMs = now.getTime() - 30 * 86_400_000;
  const recentBuys = ranked
    .flatMap((s) => (s.holdings ?? [])
      .filter((h) => h.ticker !== "ETH")
      .map((h) => ({ school: s, h, ms: investmentMs(h) })))
    .filter((r): r is { school: typeof r.school; h: Holding; ms: number } => r.ms != null && r.ms >= windowStartMs && r.ms <= now.getTime())
    .sort((a, b) => b.ms - a.ms);

  const buyRows = recentBuys.map((r, i) => `
      <tr style="background:${i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#374151">${escapeHtml(schoolDisplayName(r.school.name))}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;font-family:ui-monospace,monospace;font-weight:700;font-size:12.5px;color:#111827">$${escapeHtml(r.h.ticker)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;color:#6b7280;white-space:nowrap">${fmtDate(r.ms)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-family:ui-monospace,monospace;font-size:12px;color:#374151">${usd(r.h.marketValueUsd ?? 0)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-family:ui-monospace,monospace;font-size:12px;font-weight:600;color:${r.h.roiEthPct == null ? MUTED : tone(r.h.roiEthPct)}">${r.h.roiEthPct == null ? "—" : signedPct(r.h.roiEthPct)}</td>
      </tr>`).join("");
  const newPositions = `
  ${h3("26px 0 0")}New Buys — Past 30 Days</h3>
  ${recentBuys.length === 0
    ? `<p style="font-size:12px;color:#6b7280;margin:10px 0 0">No new buys across DormDAO in the past 30 days.</p>`
    : `<table style="width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="background:#f9fafb">
      <th style="${th("left")}">School</th>
      <th style="${th("left")}">Token</th>
      <th style="${th("left")}">Bought</th>
      <th style="${th("right")}">Value</th>
      <th style="${th("right")}">vs ETH</th>
    </tr></thead>
    <tbody>${buyRows}</tbody>
  </table>
  ${footnote(`Every buy across DormDAO since ${fmtDate(windowStartMs)}, including adds to existing positions. "vs ETH" is the return since purchase, measured against holding ETH.`)}`}`;

  const bodyHtml = `
  <p style="font-size:12.5px;color:${MUTED};margin:-8px 0 4px">${monthLabel(now)} · Season 2026–27 · As of ${fmtDate(now)}</p>
  ${kpis}
  ${leaderboard}
  ${chart}
  ${newPositions}`;

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
  };
}
