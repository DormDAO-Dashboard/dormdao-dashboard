import Papa from "papaparse";
import { SchoolRow, Holding } from "@/lib/types";
export type { Holding } from "@/lib/types";
import { slugify } from "@/lib/utils";

const SHEET_ID = "1wA8KoPlhZ1YYv6auM5yYlzjYCBRnG9en9i_qLsrlVZs";

const TAB_DISPLAY_NAMES: Record<string, string> = {
  NYU: "NYU",
  USC: "USC",
  "ST ANDREWS": "St. Andrews",
  "BOSTON COLLEGE": "Boston College",
};

function tabToDisplayName(tabName: string): string {
  const upper = tabName.toUpperCase().trim();
  return (
    TAB_DISPLAY_NAMES[upper] ??
    tabName.trim().replace(/\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
  );
}

export interface SchoolRowWithHoldings extends SchoolRow {
  holdings: Holding[];
}

function parseNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,%\s]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function isValue(s: string | undefined): boolean {
  if (!s) return false;
  if (
    s.includes("#VALUE!") ||
    s.includes("#REF!") ||
    s.includes("#ERROR!") ||
    s.includes("Please sign in")
  )
    return false;
  return true;
}

// Normalize a school name to a gviz-compatible tab name.
// Returns candidate names to try in order (first match wins).
function tabNameCandidates(name: string): string[] {
  const names: string[] = [name];
  // "St. Andrews" → "St Andrews" (gviz can't find tabs with dots in names)
  const noDots = name.replace(/\./g, "");
  if (noDots !== name) names.push(noDots);
  return names;
}

async function fetchGvizCsv(sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:csv`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const text = await res.text();
  if (text.trimStart().startsWith("<")) return [];
  const { data } = Papa.parse<string[]>(text);
  return data;
}

async function fetchSchoolTabCsv(name: string): Promise<string[][]> {
  for (const candidate of tabNameCandidates(name)) {
    const data = await fetchGvizCsv(candidate);
    // Validate: a real school tab starts with "Sub DAO Summary" or similar in col[1]
    if (data.length > 0 && data[0]?.[1]?.trim().toLowerCase().includes("sub dao")) {
      return data;
    }
  }
  return [];
}

interface LeaderboardEntry {
  name: string;
  rank: number;
  nav: number;
  usdReturn: number;
  ethReturn: number;
  avgEntryFdv: number;
  pctDeployed: number;
}

function parseLeaderboardSection(data: string[][], sectionMarker: string): LeaderboardEntry[] {
  let sectionStart = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i].some((c) => c?.trim().includes(sectionMarker))) {
      sectionStart = i;
      break;
    }
  }
  if (sectionStart === -1) return [];

  // Stop at the next "Member School Leaderboard" header
  let sectionEnd = data.length;
  for (let i = sectionStart + 1; i < data.length; i++) {
    if (data[i].some((c) => (c?.trim() ?? "").includes("Member School Leaderboard"))) {
      sectionEnd = i;
      break;
    }
  }

  let dataStart = sectionStart + 1;
  if (data[dataStart]?.some((c) => c?.trim() === "Sub DAO")) {
    dataStart++;
  }

  const entries: LeaderboardEntry[] = [];
  for (let i = dataStart; i < sectionEnd && entries.length < 20; i++) {
    const row = data[i];
    const name = row[1]?.trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (lower.includes("average") || lower.includes("total") || lower === "sub dao") continue;

    const rank = parseNumber(row[2]);
    const nav = parseNumber(row[3]);
    const usdReturn = parseNumber(row[4]);
    const ethReturn = parseNumber(row[5]);
    const avgEntryFdv = parseNumber(row[6]);
    const pctDeployed = parseNumber(row[7]);

    if (nav === 0) continue;

    entries.push({ name, rank, nav, usdReturn, ethReturn, avgEntryFdv, pctDeployed });
  }
  return entries;
}

function parseLeaderboard(data: string[][]): LeaderboardEntry[] {
  return parseLeaderboardSection(data, "Member School Leaderboard (2025-2026)");
}

function parseSinceInception(data: string[][]): LeaderboardEntry[] {
  return parseLeaderboardSection(data, "Since Inception");
}

function parseHoldings(data: string[][]): Holding[] {
  let colHeaderIdx = -1;

  // Primary: find "Liquid Positions" section header, then the "Position" column header
  for (let i = 0; i < data.length; i++) {
    if (data[i].some((c) => c?.trim() === "Liquid Positions")) {
      for (let j = i + 1; j < Math.min(i + 5, data.length); j++) {
        if (data[j].some((c) => c?.trim() === "Position")) {
          colHeaderIdx = j;
          break;
        }
      }
      break;
    }
  }

  // Fallback: find the first "Position" column header not in an NFT or exited section
  if (colHeaderIdx === -1) {
    for (let i = 0; i < data.length; i++) {
      if (!data[i].some((c) => c?.trim() === "Position")) continue;
      const prevRows = data.slice(Math.max(0, i - 5), i);
      const isNFT = prevRows.some((r) => r.some((c) => c?.trim() === "NFT Positions"));
      const isExited = prevRows.some((r) => r.some((c) => c?.trim()?.includes("Exited")));
      if (!isNFT && !isExited) {
        colHeaderIdx = i;
        break;
      }
    }
  }

  if (colHeaderIdx === -1) return [];

  const headers = data[colHeaderIdx].map((h) => h?.trim().toLowerCase());

  // Positional defaults confirmed from gviz output: col[1]=ticker, col[3]=tokens, col[5]=pct
  let posIdx = 1;
  let tokensIdx = 3;
  let pctIdx = 5;
  let chainIdx = -1;
  let fdvIdx = -1;
  let costIdx = -1;
  let dateIdx = -1;
  let gainIdx = -1;
  let roiIdx = -1;

  const foundPos = headers.findIndex((h) => h === "position");
  if (foundPos !== -1) posIdx = foundPos;
  const foundTokens = headers.findIndex((h) => h === "tokens");
  if (foundTokens !== -1) tokensIdx = foundTokens;
  const foundPct = headers.findIndex((h) => h.includes("% of sub dao") || h.includes("% of portfolio"));
  if (foundPct !== -1) pctIdx = foundPct;
  chainIdx = headers.findIndex((h) => h === "blockchain");
  fdvIdx = headers.findIndex((h) => h.includes("entry fdv"));
  costIdx = headers.findIndex((h) => h.includes("cost basis (eth)"));
  dateIdx = headers.findIndex((h) => h.includes("investment date"));
  // Gain(USD) and ROI(USD)% have no header labels — find by fixed offset from Cost Basis
  gainIdx = costIdx >= 0 ? costIdx + 5 : -1;
  roiIdx  = costIdx >= 0 ? costIdx + 3 : -1;

  const holdings: Holding[] = [];

  for (let i = colHeaderIdx + 1; i < data.length; i++) {
    const row = data[i];
    const rawTicker = row[posIdx]?.trim();
    if (!rawTicker) continue;

    if (
      rawTicker === "NFT Positions" ||
      rawTicker === "Liquid Positions (Exited/Trimmed)" ||
      rawTicker.startsWith("Member") ||
      rawTicker === "Position"
    ) break;

    if (rawTicker.includes("#") || rawTicker.length > 20) continue;
    const lower = rawTicker.toLowerCase();
    if (lower.includes("(exit)") || lower.includes("(trim)")) continue;

    const gainRaw = gainIdx >= 0 && isValue(row[gainIdx]) ? row[gainIdx]?.trim() : undefined;
    const roiRaw  = roiIdx >= 0 && isValue(row[roiIdx])  ? row[roiIdx]?.trim()  : undefined;
    // Sanity-check: gain must contain "$", roi must contain "%"
    const validGain = gainRaw?.includes("$") ?? false;
    const validRoi  = roiRaw?.includes("%")  ?? false;
    holdings.push({
      ticker: rawTicker.toUpperCase(),
      blockchain: chainIdx >= 0 ? (row[chainIdx]?.trim() || "") : "",
      tokens: isValue(row[tokensIdx]) ? parseNumber(row[tokensIdx]) : 0,
      entryFdv: fdvIdx >= 0 && isValue(row[fdvIdx]) ? row[fdvIdx]?.trim() || "" : "",
      costBasisEth: costIdx >= 0 && isValue(row[costIdx]) ? parseNumber(row[costIdx]) : 0,
      pctOfPortfolio: isValue(row[pctIdx]) ? parseNumber(row[pctIdx]) : 0,
      investmentDate: dateIdx >= 0 && isValue(row[dateIdx]) ? row[dateIdx]?.trim() || "" : "",
      ...(validGain ? { gainUsd: parseNumber(gainRaw!) } : {}),
      ...(validRoi  ? { roiUsdPct: parseNumber(roiRaw!) } : {}),
    });
  }

  return holdings;
}

export async function fetchSheetsData(): Promise<{
  schools: SchoolRowWithHoldings[];
  sinceInceptionSchools: SchoolRow[];
  fetchedAt: string;
}> {
  // 1. Fetch leaderboard via gviz
  const leaderboardData = await fetchGvizCsv("LEADERBOARD");
  const leaderboardEntries = parseLeaderboard(leaderboardData);
  const sinceInceptionEntries = parseSinceInception(leaderboardData);

  if (leaderboardEntries.length === 0) {
    return { schools: [], sinceInceptionSchools: [], fetchedAt: new Date().toISOString() };
  }

  // 2. Fetch holdings for each school in parallel
  const schoolsWithHoldings = await Promise.all(
    leaderboardEntries.map(async (entry) => {
      const tabData = await fetchSchoolTabCsv(entry.name);
      const holdings = parseHoldings(tabData);
      return { ...entry, holdings };
    })
  );

  // 3. Build school rows using leaderboard values directly — no recalculation
  const schools: SchoolRowWithHoldings[] = schoolsWithHoldings.map((s) => {
    const displayName = tabToDisplayName(s.name);
    return {
      rank: s.rank,
      name: displayName,
      slug: slugify(displayName),
      nav: s.nav,
      usdReturn: s.usdReturn,
      ethReturn: s.ethReturn,
      avgEntryFdv: s.avgEntryFdv,
      pctDeployed: s.pctDeployed,
      holdings: s.holdings,
    };
  });

  schools.sort((a, b) => a.rank - b.rank);

  // 4. Build since inception rows (stats only, reuse same display names)
  const nameToDisplay = new Map(schools.map((s) => [s.name.toLowerCase(), s]));
  const sinceInceptionSchools: SchoolRow[] = sinceInceptionEntries.map((e) => {
    const displayName = tabToDisplayName(e.name);
    const existing = nameToDisplay.get(displayName.toLowerCase());
    return {
      rank: e.rank,
      name: displayName,
      slug: existing?.slug ?? slugify(displayName),
      nav: e.nav || existing?.nav || 0,
      usdReturn: e.usdReturn,
      ethReturn: e.ethReturn,
      avgEntryFdv: e.avgEntryFdv,
      pctDeployed: e.pctDeployed || existing?.pctDeployed || 0,
    };
  }).sort((a, b) => a.rank - b.rank);

  return { schools, sinceInceptionSchools, fetchedAt: new Date().toISOString() };
}
