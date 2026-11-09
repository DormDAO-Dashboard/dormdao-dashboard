import { createServiceClient } from "@/lib/supabase/server";
import { buildTemplate, escapeHtml, footerLinkHtml, APP_URL } from "@/lib/email";
import { mergeHoldingsByTicker, parseDateMsAsc } from "@/lib/holdings";
import { schoolDisplayName } from "@/lib/schoolData";
import { SEASON_START_DATE, SEASON_START_NAV_USD } from "@/lib/seasonBaseline";
import { getScaledTokenSeasonPerformance } from "@/lib/seasonPerformance";
import { getPositionWindowReturns } from "@/lib/snapshotReturns";
import { previousMonthPeriod, getClosingState, monthReturn, monthIsSeasonStart, type ClosingState } from "@/lib/report-period";
import { slugify } from "@/lib/utils";
import type { Holding } from "@/lib/types";

// The two monthly report emails — per-school Portfolio Report and the
// DormDAO-wide Ramen Report — each describing the last completed month as
// of its final day, rebuilt from the hourly portfolio_snapshots history
// (lib/report-period.ts) rather than today's live data. Ported from the
// "Portfolio Report Email" / "Leaderboard Digest Email" design previews,
// minus their illustrative placeholder figures and internal notes.
//
// Preview-only for now: rendered in the admin Email Functions page via
// /api/admin/report-emails/preview. Nothing here sends anything.

export interface ReviewStatus {
  status: "in_review";
  flags: string[];
}

export interface BuiltEmail {
  subject: string;
  html: string;
  // Open items for the reviewer, shown above the admin preview, never in
  // the email itself.
  review?: ReviewStatus;
}

export interface BuildOptions {
  // Month-end state already loaded for this period — the sender builds all
  // 18 emails from one load instead of one per email.
  state?: ClosingState;
  // Building for a real send rather than the admin preview: placeholders
  // meant only for the reviewer (the missing-disclosure box) are left out.
  forSend?: boolean;
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

// Mail-merge field for the recipient's first name. The built email keeps it
// as a literal token; personalizeReport() fills it per recipient at send
// time, and the admin preview shows it highlighted.
export const RECIPIENT_NAME_TOKEN = "{{firstName}}";

export function personalizeReport(html: string, displayName: string | null | undefined, userId?: string): string {
  const first = displayName?.trim().split(/\s+/)[0];
  const named = html.split(RECIPIENT_NAME_TOKEN).join(first ? escapeHtml(first) : "there");
  // Reports are built once with the generic footer link; each recipient
  // gets their own one-click unsubscribe instead.
  return userId ? named.split(footerLinkHtml()).join(footerLinkHtml(userId)) : named;
}

// Intro shown above the report. PLACEHOLDER DRAFT: Jack's team is writing
// the final copy and sending it to Zack for review — replace this, then set
// PORTFOLIO_INTRO_APPROVED. Fields: {{firstName}} (merged per recipient),
// {club}, {month}.
const PORTFOLIO_INTRO_DRAFT =
  `Hi ${RECIPIENT_NAME_TOKEN}, here's {club}'s portfolio report for {month}: your NAV and returns, every active position, and your most recent portfolio transactions.`;
const PORTFOLIO_INTRO_APPROVED = false;

export async function buildPortfolioReportEmail(slug: string, now: Date = new Date(), opts: BuildOptions = {}): Promise<BuiltEmail | null> {
  const period = opts.state?.period ?? previousMonthPeriod(now);
  const state = opts.state ?? await getClosingState(period);
  const school = state.schools.find((s) => slugify(s.name) === slug);
  if (!school) return null;

  const label = schoolDisplayName(school.name);
  const merged = mergeHoldingsByTicker(school.holdings);
  const nfts = mergeHoldingsByTicker(school.nftHoldings);
  const ethHolding = merged.find((h) => h.ticker === "ETH");
  const ethPriceUsd = school.ethPriceUsd;
  const positions = [...merged.filter((h) => h.ticker !== "ETH"), ...nfts]
    .sort((a, b) => (b.marketValueUsd ?? 0) - (a.marketValueUsd ?? 0));
  const nav = school.navUsd;
  const asOfMs = period.asOf.getTime();

  const monthStartMs = period.monthStart.getTime();
  const firstMonth = monthIsSeasonStart(period);

  const service = createServiceClient();
  const [mtd, season, monthByTicker, { data: changeRows }] = await Promise.all([
    monthReturn(school, period),
    getScaledTokenSeasonPerformance(
      school.name, SEASON_START_NAV_USD[school.name], ethPriceUsd, [...merged, ...nfts], school.exitedHoldings,
    ),
    firstMonth
      ? Promise.resolve(null)
      : getPositionWindowReturns(school.name, period.monthStart.toISOString(), ethPriceUsd, positions),
    service
      .from("portfolio_changes")
      .select("change_type, token_ticker, detected_at")
      .eq("school_name", school.name)
      .neq("token_ticker", "ETH")
      .lt("detected_at", period.cutoff.toISOString())
      .order("detected_at", { ascending: false })
      .limit(3),
  ]);

  const flags: string[] = [];
  if (state.stale.some((x) => x.name === school.name)) {
    flags.push(`Closing figures come from a snapshot taken ${fmtDate(new Date(school.capturedAt))}, more than a day before the month ended.`);
  }
  if (!mtd) flags.push(`No snapshot from early ${monthLabel(period.monthStart)} to measure the month from, so Month-to-Date is blank.`);
  if (school.inceptionEthReturn == null) flags.push("Sub DAO opening year unavailable, so Since Inception is blank.");
  if (!PORTFOLIO_INTRO_APPROVED) {
    flags.unshift("Intro copy is a placeholder draft. Jack's team to write the final text and Zack to review it, then replace PORTFOLIO_INTRO_DRAFT in lib/report-emails.ts.");
  }

  const monthRange = `${fmtDate(monthStartMs)}–${fmtDate(asOfMs)}`;
  const seasonRange = `${fmtDate(new Date(`${SEASON_START_DATE}T00:00:00Z`))}–${fmtDate(asOfMs)}`;

  // ── Headline numbers
  const headline = `
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;margin-bottom:20px">
    <tr>
      <td style="width:50%;padding:14px 16px;vertical-align:top">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">NAV</div>
        <div style="font-size:20px;font-weight:700;font-family:ui-monospace,monospace;color:#111827">${usd(nav)}</div>
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
        ${returnLine("Current Season", seasonRange, school.seasonUsdReturn)}
        ${returnLine("Since Inception", `through ${fmtDate(asOfMs)}`, school.inceptionUsdReturn)}
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:14px 16px;vertical-align:top;border-top:1px solid #e5e7eb">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Performance vs ETH</div>
        ${returnLine("Month-to-Date", monthRange, mtd?.ethReturnPct, true)}
        ${returnLine("Current Season", seasonRange, school.seasonEthReturn)}
        ${returnLine("Since Inception", `through ${fmtDate(asOfMs)}`, school.inceptionEthReturn)}
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
    // In the season's first month, MTD and Season are the same window.
    const mtdRow = monthByTicker ? monthByTicker[h.ticker] : seasonRow;
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
  ${footnote("Since Purchase is each position's return since it was opened. Percentages are measured against holding ETH.")}`;

  // ── Insights
  const withRoi = positions.filter((h) => h.roiEthPct != null);
  const beatEth = withRoi.filter((h) => (h.roiEthPct ?? 0) > 0).length;
  const winRate = withRoi.length ? Math.round((beatEth / withRoi.length) * 100) : null;
  const byRoi = [...withRoi].sort((a, b) => (b.roiEthPct ?? 0) - (a.roiEthPct ?? 0));
  const best = byRoi[0];
  const worst = byRoi[byRoi.length - 1];
  const largest = positions[0];
  const smallest = positions[positions.length - 1];
  const ages = positions.map(investmentMs).filter((ms): ms is number => ms != null).map((ms) => (asOfMs - ms) / 86_400_000);
  const avgAge = ages.length ? Math.round(ages.reduce((s, d) => s + d, 0) / ages.length) : null;
  const avgSize = positions.length ? positions.reduce((s, h) => s + (h.marketValueUsd ?? 0), 0) / positions.length : null;
  const pctOfNav = (h: Holding | undefined) =>
    h && nav > 0 ? `${(((h.marketValueUsd ?? 0) / nav) * 100).toFixed(1)}% of NAV` : "—";
  const bestWorstSub = (h: Holding | undefined) =>
    h ? `${signedPct(h.roiEthPct ?? 0)} vs ETH · ${signedUsd(h.gainUsd ?? 0)}` : "—";

  const changes = (changeRows ?? []) as Array<{ change_type: string; token_ticker: string; detected_at: string }>;
  const changesHtml = changes.length === 0 ? "" : `
  <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0">
    <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Most recent portfolio transactions</div>
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
      ${statBox("Rank", `#${school.seasonRank}`, "by season ETH return", GREEN)}
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

  const schoolSlug = slugify(school.name);
  const dashboardUrl = `${APP_URL}/schools/${schoolSlug}`;
  const intro = PORTFOLIO_INTRO_DRAFT
    .replace("{club}", escapeHtml(label))
    .replace("{month}", monthLabel(period.monthStart));
  const bodyHtml = `
  <p style="font-size:12px;color:#6b7280;margin:-8px 0 16px">${monthLabel(period.monthStart)} · Season 2026–27 · As of ${fmtDate(asOfMs)}</p>
  <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px">${intro}</p>
  <p style="margin:0 0 20px"><a href="${dashboardUrl}" style="display:inline-block;padding:10px 22px;background:${GREEN};color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">View Full Portfolio Dashboard &rarr;</a></p>
  ${headline}
  ${positionsTable}
  ${insights}`;

  return {
    subject: `${label} – Monthly Portfolio Report`,
    html: buildTemplate({
      title: "Your Monthly Portfolio Report",
      schoolLabel: escapeHtml(label),
      schoolSlug,
      titleIcon: true,
      bodyHtml,
      maxWidth: 680,
    }),
    review: { status: "in_review", flags },
  };
}

// ── Ramen Report (DormDAO-wide monthly leaderboard digest) ───────────────────
//
// Kept deliberately short (per Zack's review): a portfolio snapshot, two
// leaderboards on different timeframes — the season-to-date "Performance
// Leaderboard" bar chart, then the report month's leaderboard — and the
// positions opened during the month. No since-inception figures.
//
// Like the school report, it describes the last completed month as of its
// final day (lib/report-period.ts), never today's live numbers.
//
// Stays in review until Jack signs off: `review` on the result lists every
// open item (missing disclosure, missing or stale snapshots, opened
// positions the snapshot history disagrees on) and the admin preview shows
// it above the email.

// Approved disclosure text for the footer, as HTML. Deliberately null: no
// approved wording exists in the codebase or the design previews, and it
// must come from whoever signs off on legal language — not be written here.
// While it's null the email shows a visible placeholder and the review list
// flags it, so the report can't look finished without it.
const DIGEST_DISCLOSURE_HTML: string | null = null;

// Copy that's still unapproved, for the admin Send confirmation: what will
// go out as-is if the reports are sent now.
export function unapprovedCopyWarnings(): string[] {
  const warnings: string[] = [];
  if (!DIGEST_DISCLOSURE_HTML) warnings.push("The Ramen Report has no approved disclosure text, so it will go out with no disclosure.");
  if (!PORTFOLIO_INTRO_APPROVED) warnings.push("Portfolio reports open with the draft intro (\"Hi {first name}, here's {club}'s portfolio report…\"), not final copy reviewed by Zack.");
  return warnings;
}

export async function buildLeaderboardDigestEmail(now: Date = new Date(), opts: BuildOptions = {}): Promise<BuiltEmail> {
  const period = opts.state?.period ?? previousMonthPeriod(now);
  const state = opts.state ?? await getClosingState(period);
  const schools = state.schools; // sorted by season ETH return
  const flags: string[] = [];

  const monthStartIso = period.monthStart.toISOString();
  const monthStartMs = period.monthStart.getTime();
  const cutoffMs = period.cutoff.getTime();
  const asOfMs = period.asOf.getTime();
  const monthRange = `${fmtDate(monthStartMs)} – ${fmtDate(asOfMs)}`;
  const seasonRange = `${fmtDate(new Date(`${SEASON_START_DATE}T00:00:00Z`))} – ${fmtDate(asOfMs)}`;
  const firstMonth = monthIsSeasonStart(period);

  const service = createServiceClient();
  const [monthReturns, { data: buyRows }, { data: docRows }] = await Promise.all([
    Promise.all(schools.map((s) => monthReturn(s, period))),
    service
      .from("portfolio_changes")
      .select("school_name, token_ticker, detected_at")
      .eq("change_type", "buy")
      .gte("detected_at", monthStartIso)
      .lt("detected_at", period.cutoff.toISOString()),
    // Pitch materials on file, to flag opened positions with nothing to link to.
    service.from("token_documents").select("school, token_ticker"),
  ]);

  // ── Accuracy checks (shown to the reviewer, never in the email)
  if (state.missing.length) {
    flags.push(`No snapshot before ${fmtDate(cutoffMs)} for ${state.missing.map(schoolDisplayName).join(", ")}, so they're left out entirely.`);
  }
  if (state.stale.length) {
    flags.push(`Closing figures come from a snapshot more than a day before month end for: ${state.stale.map((x) => `${schoolDisplayName(x.name)} (${fmtDate(new Date(x.capturedAt))})`).join(", ")}.`);
  }
  const monthBy = new Map(schools.map((s, i) => [s.name, monthReturns[i]]));
  const noBaseline = schools.filter((s) => !monthBy.get(s.name)).map((s) => schoolDisplayName(s.name));
  if (noBaseline.length) {
    flags.push(`No snapshot from early in the month for ${noBaseline.join(", ")}, so they're unranked in the month leaderboard.`);
  }
  const lateBaseline = schools
    .map((s) => ({ s, r: monthBy.get(s.name) }))
    .filter((x) => x.r?.baselineCapturedAt && new Date(x.r.baselineCapturedAt).getTime() - monthStartMs > 36 * 3_600_000)
    .map((x) => `${schoolDisplayName(x.s.name)} (${fmtDate(new Date(x.r!.baselineCapturedAt!))})`);
  if (lateBaseline.length) flags.push(`Month baseline is a late snapshot, not the 1st, for: ${lateBaseline.join(", ")}.`);
  if (firstMonth) {
    flags.push(`${monthLabel(period.monthStart)} is the season's first month, so the month leaderboard and the season chart cover the same period and show the same returns.`);
  }

  const n = schools.length || 1;
  const totalNav = schools.reduce((sum, s) => sum + s.navUsd, 0);
  const avgEth = schools.reduce((sum, s) => sum + s.seasonEthReturn, 0) / n;
  const avgUsd = schools.reduce((sum, s) => sum + s.seasonUsdReturn, 0) / n;
  const avgDeployed = schools.reduce((sum, s) => sum + s.pctDeployed, 0) / n;

  // ── Portfolio snapshot
  const kpi = (labelText: string, value: string, sub: string) => `
      <td style="width:25%;padding:14px 10px;text-align:center;vertical-align:top">
        <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${labelText}</div>
        <div style="font-size:18px;font-weight:700;color:#111827;font-family:ui-monospace,monospace">${value}</div>
        <div style="font-size:10px;color:${MUTED};margin-top:3px">${sub}</div>
      </td>`;
  const snapshot = `
  ${h3("18px 0 0")}Portfolio Snapshot <span style="font-weight:400;color:${MUTED};font-size:11px">As of ${fmtDate(asOfMs)}</span></h3>
  <table style="width:100%;border-collapse:collapse;margin-top:10px;border:1px solid #e5e7eb">
    <tr>
      ${kpi("DormDAO NAV", usd(totalNav), `${schools.length} schools`)}
      ${kpi("Avg ETH Return", signedPct(avgEth), "Season to date")}
      ${kpi("Avg USD Return", signedPct(avgUsd), "Season to date")}
      ${kpi("Avg Deployed", `${avgDeployed.toFixed(1)}%`, "NAV outside ETH treasury")}
    </tr>
  </table>`;

  const pctCell = (v: number | null | undefined, bold = false) => v == null
    ? `<td style="${numCell};color:${MUTED}">—</td>`
    : `<td style="${numCell};color:${tone(v)};white-space:nowrap${bold ? ";font-weight:700" : ""}">${signedPct(v)}</td>`;

  // ── Performance Leaderboard (season to date): ETH return as diverging
  // bars — positive grows right of center, negative left, scaled to the
  // largest absolute return on the board, so the size of a lead is visible —
  // with USD Return and % Deployed beside it. Nested tables, not flex/grid —
  // email clients (Outlook especially) don't support them.
  const maxAbs = Math.max(1, ...schools.map((s) => Math.abs(s.seasonEthReturn)));
  const barRows = schools.map((s, i) => {
    const w = ((Math.abs(s.seasonEthReturn) / maxAbs) * 100).toFixed(1);
    const bar = (side: "left" | "right") =>
      `<div style="height:14px;width:${w}%;background:${side === "right" ? GREEN : RED};${side === "right" ? "border-radius:0 3px 3px 0" : "border-radius:3px 0 0 3px;margin-left:auto"}"></div>`;
    const leftCell = s.seasonEthReturn < 0 ? bar("left") : "";
    const rightCell = s.seasonEthReturn >= 0 ? bar("right") : "";
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
        <td style="${side};font-weight:700;color:${tone(s.seasonEthReturn)}">${signedPct(s.seasonEthReturn)}</td>
        <td style="${side};color:${tone(s.seasonUsdReturn)}">${signedPct(s.seasonUsdReturn)}</td>
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
  ${footnote(`Ranked by season ETH return as of ${fmtDate(asOfMs)}. Deployed is the share of NAV held outside the ETH treasury.`)}`;

  // ── Month leaderboard
  const monthRanked = schools
    .map((s) => ({ s, r: monthBy.get(s.name) ?? null }))
    .sort((a, b) => {
      if (a.r && b.r) return b.r.ethReturnPct - a.r.ethReturnPct;
      if (a.r) return -1;
      if (b.r) return 1;
      return a.s.seasonRank - b.s.seasonRank;
    });
  const monthRows = monthRanked.map(({ s, r }, i) => `
      <tr style="background:${r && i < 3 ? "#f0fbf6" : i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="${cell};font-family:ui-monospace,monospace;font-weight:700;font-size:12px;color:${r && i < 3 ? "#111827" : MUTED};text-align:center">${r ? i + 1 : "—"}</td>
        <td style="${cell};font-size:12.5px;font-weight:600;color:#111827">${escapeHtml(schoolDisplayName(s.name))}</td>
        ${pctCell(r?.ethReturnPct, true)}
        ${pctCell(r?.usdReturnPct)}
      </tr>`).join("");
  const monthBoard = `
  ${h3("26px 0 0")}${escapeHtml(monthLabel(period.monthStart).split(" ")[0])} Leaderboard <span style="font-weight:400;color:${MUTED};font-size:11px">${monthRange}</span></h3>
  <table style="width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="background:#f9fafb">
      <th style="${th("center")}">Rank</th>
      <th style="${th("left")}">School</th>
      <th style="${th("right")}">ETH Return</th>
      <th style="${th("right")}">USD Return</th>
    </tr></thead>
    <tbody>${monthRows}</tbody>
  </table>
  ${footnote(`Ranked by ETH return over ${monthRange}${firstMonth ? " — the season's first month, so these match the season returns above" : ""}.${noBaseline.length ? " Schools without a snapshot for the start of the month show — and aren't ranked." : ""}`)}`;

  // ── Positions opened during the month: a ticker whose earliest tranche
  // falls in the month. Adds to a position a school already held don't count.
  type Opened = { school: (typeof schools)[number]; h: Holding; ms: number };
  const opened: Opened[] = [];
  let undated = 0;
  for (const s of schools) {
    const tranches = [...s.holdings, ...s.nftHoldings].filter((h) => h.ticker !== "ETH");
    const firstBuy = new Map<string, number>();
    for (const h of tranches) {
      const ms = investmentMs(h);
      if (ms == null) { undated++; continue; }
      firstBuy.set(h.ticker, Math.min(firstBuy.get(h.ticker) ?? Infinity, ms));
    }
    for (const h of mergeHoldingsByTicker(tranches)) {
      const ms = firstBuy.get(h.ticker);
      if (ms != null && ms >= monthStartMs && ms < cutoffMs) opened.push({ school: s, h, ms });
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
  // Each opened position links to its token page, whose Fund Documents
  // section is the folder of pitch materials (decks, exec summaries) on file
  // for that token.
  const pitchUrl = (ticker: string) => `${APP_URL}/tokens/${encodeURIComponent(ticker.toLowerCase())}`;
  const docKeys = new Set(((docRows ?? []) as Array<{ school: string | null; token_ticker: string | null }>)
    .filter((d) => d.school && d.token_ticker)
    .map((d) => key(d.school!.toLowerCase(), d.token_ticker!)));
  const noPitch = opened
    .filter((o) => !docKeys.has(key(o.school.name.toLowerCase(), o.h.ticker)))
    .map((o) => `${schoolDisplayName(o.school.name)} $${o.h.ticker}`);
  if (noPitch.length) flags.push(`No pitch materials uploaded for: ${noPitch.join(", ")}. Their links open the token page, which won't show a pitch from that club until one is uploaded.`);
  if (onlyDetected.length) flags.push(`Buy detected in snapshots during the month but not listed (investment date is earlier, or the position was closed by month end): ${onlyDetected.join(", ")}.`);

  const openedRows = opened.map((r, i) => `
      <tr style="background:${i % 2 ? "#fafafa" : "#ffffff"}">
        <td style="${cell};font-family:ui-monospace,monospace;font-weight:700;font-size:12.5px;white-space:nowrap"><a href="${pitchUrl(r.h.ticker)}" style="color:${GREEN};text-decoration:none">$${escapeHtml(r.h.ticker)} &rarr;</a></td>
        <td style="${cell};font-size:12px;color:#374151">${escapeHtml(schoolDisplayName(r.school.name))}</td>
        <td style="${cell};font-size:11px;color:#6b7280;white-space:nowrap">${fmtDate(r.ms)}</td>
        <td style="${numCell};color:#374151;white-space:nowrap">${r.h.costBasisEth > 0 ? `${r.h.costBasisEth.toFixed(2)} ETH` : "—"}</td>
        <td style="${numCell};color:#374151">${r.h.marketValueUsd == null ? "—" : usd(r.h.marketValueUsd)}</td>
      </tr>`).join("");
  const newPositions = `
  ${h3("26px 0 0")}Positions Opened <span style="font-weight:400;color:${MUTED};font-size:11px">${monthRange}</span></h3>
  ${opened.length === 0
    ? `<p style="font-size:12px;color:#6b7280;margin:10px 0 0">No new positions opened across DormDAO in ${escapeHtml(monthLabel(period.monthStart))}.</p>`
    : `<table style="width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="background:#f9fafb">
      <th style="${th("left")}">Token</th>
      <th style="${th("left")}">Club</th>
      <th style="${th("left")}">Opened</th>
      <th style="${th("right")}">Cost Basis (ETH)</th>
      <th style="${th("right")}">Value</th>
    </tr></thead>
    <tbody>${openedRows}</tbody>
  </table>
  ${footnote(`New positions only — adds to positions a club already held aren't listed. Cost Basis is the ETH each club invested; Value is as of ${fmtDate(asOfMs)}. Click a token for its pitch materials.`)}`}`;

  // ── Disclosure
  if (!DIGEST_DISCLOSURE_HTML) {
    flags.unshift("Disclosure text is missing. Add the approved wording to DIGEST_DISCLOSURE_HTML in lib/report-emails.ts before this can send.");
  }
  const disclosure = DIGEST_DISCLOSURE_HTML
    ? `<div style="margin-top:22px;padding-top:12px;border-top:1px solid #f0f0f0;font-size:10px;color:${MUTED};line-height:1.5">${DIGEST_DISCLOSURE_HTML}</div>`
    : opts.forSend
    ? ""
    : `<div style="margin-top:22px;padding:10px 12px;border:1px dashed #f59e0b;background:#fffbeb;border-radius:6px;font-size:11px;color:#92400e;line-height:1.5"><strong>Disclosure — awaiting approved text.</strong> This placeholder must be replaced before the report is sent.</div>`;

  const bodyHtml = `
  <p style="font-size:12.5px;color:${MUTED};margin:-8px 0 4px">${monthLabel(period.monthStart)} · Season 2026–27 · As of ${fmtDate(asOfMs)}</p>
  ${snapshot}
  ${chart}
  ${monthBoard}
  ${newPositions}
  ${disclosure}`;

  return {
    subject: "Ramen Report – Monthly Dorm Performance Leaderboard",
    html: buildTemplate({
      title: "Ramen Report",
      schoolLabel: "DormDAO · All Schools",
      titleIcon: true,
      bodyHtml,
      cta: { label: "View Full DormDAO Leaderboard →", url: `${APP_URL}/leaderboard` },
      maxWidth: 680,
    }),
    review: { status: "in_review", flags },
  };
}
