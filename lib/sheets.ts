import Papa from "papaparse";
import { SchoolRow, Holding, ExitedHolding } from "@/lib/types";
export type { Holding, ExitedHolding } from "@/lib/types";
import { slugify } from "@/lib/utils";

const SHEET_ID = "1wA8KoPlhZ1YYv6auM5yYlzjYCBRnG9en9i_qLsrlVZs";


const TAB_DISPLAY_NAMES: Record<string, string> = {
  NYU: "NYU",
  USC: "USC",
  UVA: "UVA",
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
  exitedHoldings: ExitedHolding[];
  nftHoldings: Holding[];
}

function parseNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,%\s]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Like parseNumber but respects K/M/B/T suffixes (e.g. "$8,791M" → 8_791_000_000)
function parseSuffixedNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const t = raw.trim().toUpperCase().replace(/[$,\s]/g, "");
  const n = parseFloat(t);
  if (isNaN(n)) return 0;
  if (t.endsWith("T")) return n * 1e12;
  if (t.endsWith("B")) return n * 1e9;
  if (t.endsWith("M")) return n * 1e6;
  if (t.endsWith("K")) return n * 1e3;
  return n;
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
    const avgEntryFdv = parseNumber(row[6]) * 1000;
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
  // Use the full header string to avoid matching the summary stats "Since Inception" row
  return parseLeaderboardSection(data, "Member School Leaderboard (Since Inception)");
}

function parseHistoricalLeaderboard(data: string[][]): LeaderboardEntry[] {
  // Historical tabs use "Member School Leaderboard" without a year suffix,
  // or fall back to the first leaderboard-like section found.
  const withYear = parseLeaderboardSection(data, "Member School Leaderboard (2024-2025)");
  if (withYear.length > 0) return withYear;
  const withYear2 = parseLeaderboardSection(data, "Member School Leaderboard (2023-2024)");
  if (withYear2.length > 0) return withYear2;
  // Fallback: first leaderboard section regardless of name
  return parseLeaderboardSection(data, "Member School Leaderboard");
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

  // Positional defaults confirmed from gviz output.
  // The CSV has two sections side-by-side:
  //   Liquid Positions: col[1]=ticker, col[2]=price, col[3]=tokens, col[4]=mktval, col[5]=pct
  //   Position Statistics: col[7]=date, col[8]=position, col[9]=chain, col[10]=fdv,
  //                        col[11]=costETH, col[12]=7dETH%, col[13]=7dUSD%,
  //                        col[14]=roiETH%, col[15]=roiUSD%, col[16]=gainUSD
  // Only "Position", "Investment Date", "Position", "Blockchain" have header labels.
  // All other columns are unlabeled, so we use positional defaults.
  let posIdx = 1;
  let tokensIdx = 3;
  let pctIdx = 5;
  let chainIdx = 9;
  let fdvIdx = 10;
  let costIdx = 11;
  let dateIdx = 7;
  let gainIdx = 16;
  let roiIdx = 15;
  let roiEthIdx = 14;

  const foundPos = headers.findIndex((h) => h === "position");
  if (foundPos !== -1) posIdx = foundPos;
  const foundTokens = headers.findIndex((h) => h === "tokens");
  if (foundTokens !== -1) tokensIdx = foundTokens;
  const foundPct = headers.findIndex((h) => h.includes("% of sub dao") || h.includes("% of portfolio"));
  if (foundPct !== -1) pctIdx = foundPct;
  const foundChain = headers.findIndex((h) => h === "blockchain");
  if (foundChain !== -1) chainIdx = foundChain;
  const foundFdv = headers.findIndex((h) => h.includes("entry fdv"));
  if (foundFdv !== -1) fdvIdx = foundFdv;
  const foundCost = headers.findIndex((h) => h.includes("cost basis (eth)") || h.includes("cost basis eth"));
  if (foundCost !== -1) {
    costIdx = foundCost;
    gainIdx = costIdx + 5;
    roiIdx  = costIdx + 4;
    roiEthIdx = costIdx + 3;
  }
  const foundDate = headers.findIndex((h) => h.includes("investment date"));
  if (foundDate !== -1) dateIdx = foundDate;

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

    const gainRaw   = gainIdx >= 0 && isValue(row[gainIdx])   ? row[gainIdx]?.trim()   : undefined;
    const roiRaw    = roiIdx >= 0 && isValue(row[roiIdx])     ? row[roiIdx]?.trim()    : undefined;
    const roiEthRaw = roiEthIdx >= 0 && isValue(row[roiEthIdx]) ? row[roiEthIdx]?.trim() : undefined;
    // Sanity-check: gain must contain "$", roi must contain "%"
    const validGain   = gainRaw?.includes("$")   ?? false;
    const validRoi    = roiRaw?.includes("%")     ?? false;
    const validRoiEth = roiEthRaw?.includes("%")  ?? false;
    holdings.push({
      ticker: rawTicker.toUpperCase(),
      blockchain: (chainIdx >= 0 ? row[chainIdx]?.trim() : "") || (rawTicker.toUpperCase() === "ETH" ? "Ethereum" : ""),
      tokens: isValue(row[tokensIdx]) ? parseNumber(row[tokensIdx]) : 0,
      entryFdv: fdvIdx >= 0 && isValue(row[fdvIdx]) ? row[fdvIdx]?.trim() || "" : "",
      costBasisEth: costIdx >= 0 && isValue(row[costIdx]) ? parseNumber(row[costIdx]) : 0,
      pctOfPortfolio: isValue(row[pctIdx]) ? parseNumber(row[pctIdx]) : 0,
      investmentDate: dateIdx >= 0 && isValue(row[dateIdx]) ? row[dateIdx]?.trim() || "" : "",
      ...(validGain   ? { gainUsd:    parseNumber(gainRaw!) }   : {}),
      ...(validRoi    ? { roiUsdPct:  parseNumber(roiRaw!) }    : {}),
      ...(validRoiEth ? { roiEthPct:  parseNumber(roiEthRaw!) } : {}),
    });
  }

  return holdings;
}

function parseNftHoldings(data: string[][]): Holding[] {
  // Find "NFT Positions" section marker (may appear in any column)
  let sectionStart = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i].some((c) => c?.trim() === "NFT Positions")) {
      sectionStart = i;
      break;
    }
  }
  if (sectionStart === -1) return [];

  // Find header row (row with "Position" within next 5 rows)
  let headerIdx = -1;
  for (let i = sectionStart + 1; i < Math.min(sectionStart + 5, data.length); i++) {
    if (data[i].some((c) => c?.trim() === "Position")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  // Fixed column layout (Oregon/Texas NFT section):
  // col[0]=name, col[3]=qty, col[5]=pct, col[7]=date,
  // col[9]=chain, col[11]=costETH, col[14]=roiETH%, col[15]=roiUSD%, col[16]=gainUSD
  const holdings: Holding[] = [];
  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i];

    // Check section-end markers BEFORE skipping empty rows (markers often have empty col[0])
    if (row.some((c) => {
      const v = c?.trim() ?? "";
      return v === "Liquid Positions (Exited/Trimmed)" || v === "Liquid Positions";
    })) break;

    const nftName = row[0]?.trim();
    if (!nftName) continue;
    if (nftName.startsWith("Member") || nftName === "Position") break;
    if (nftName.length > 60) continue;

    const pct    = isValue(row[5])  ? parseNumber(row[5])  : 0;
    const tokens = isValue(row[3])  ? parseNumber(row[3])  : 0;
    if (!pct && !tokens) continue;

    const gainRaw   = row[16]?.trim();
    const roiUsdRaw = row[15]?.trim();
    const roiEthRaw = row[14]?.trim();
    const validGain   = !!(gainRaw   && isValue(gainRaw)   && gainRaw.includes("$"));
    const validRoiUsd = !!(roiUsdRaw && isValue(roiUsdRaw) && roiUsdRaw.includes("%"));
    const validRoiEth = !!(roiEthRaw && isValue(roiEthRaw) && roiEthRaw.includes("%"));

    const marketValueUsd = isValue(row[4]) ? parseNumber(row[4]) : 0;
    holdings.push({
      ticker: nftName.toUpperCase(),
      blockchain: isValue(row[9]) ? row[9]?.trim() || "" : "",
      tokens,
      entryFdv: "",
      costBasisEth: isValue(row[11]) ? parseNumber(row[11]) : 0,
      pctOfPortfolio: pct,
      investmentDate: isValue(row[7]) ? row[7]?.trim() || "" : "",
      ...(marketValueUsd > 0 ? { marketValueUsd } : {}),
      ...(validGain   ? { gainUsd:   parseNumber(gainRaw!)   } : {}),
      ...(validRoiUsd ? { roiUsdPct: parseNumber(roiUsdRaw!) } : {}),
      ...(validRoiEth ? { roiEthPct: parseNumber(roiEthRaw!) } : {}),
    });
  }
  return holdings;
}

function parseExitedHoldings(data: string[][]): ExitedHolding[] {
  // Find "Liquid Positions (Exited/Trimmed)" section marker
  let sectionStart = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i].some((c) => c?.trim() === "Liquid Positions (Exited/Trimmed)")) {
      sectionStart = i;
      break;
    }
  }
  if (sectionStart === -1) return [];

  // Find header row (a row where any cell is exactly "Position")
  let headerRowIdx = -1;
  for (let i = sectionStart + 1; i < Math.min(sectionStart + 8, data.length); i++) {
    if (data[i].some((c) => c?.trim() === "Position")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) return [];

  // Different school tabs have different column counts and label placements — most
  // columns have no header text. Use the ticker "Position" column as anchor for the
  // left table, then pattern-detect right-table values per data row.
  const headers = data[headerRowIdx].map((h) => h?.trim().toLowerCase() ?? "");
  const posIdx  = headers.indexOf("position"); // first "Position" = ticker column
  if (posIdx === -1) return [];

  // Left table is always at fixed offsets from posIdx (consistent across all schools)
  const tokensSoldIdx = posIdx + 1;
  const tokenPriceIdx = posIdx + 2;
  const ethValueIdx   = posIdx + 3;
  const marketValIdx  = posIdx + 4;
  // Right-table values begin after the left table; scan from here
  const scanStart     = posIdx + 5;

  // Date pattern: YYYY/MM/DD, YYYY-MM-DD, or mixed separators
  const isDate = (v: string) => /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(v);
  // FDV pattern: ends with M, B, or T after stripping non-alpha (e.g. "$3,752M")
  const isFdv  = (v: string) => /[MBT]$/i.test(v.toUpperCase().replace(/[^A-Z]/g, ""));

  const results: ExitedHolding[] = [];
  let inNftSubsection = false;
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    const rawFull = row[posIdx]?.trim();
    if (!rawFull) continue;
    const lowerFull = rawFull.toLowerCase();
    // Stop at Member leaderboard
    if (rawFull.startsWith("Member")) break;
    // NFT subsection section label — skip and flag remaining rows as NFT exits
    if (lowerFull.startsWith("nft positions")) {
      inNftSubsection = true;
      continue;
    }
    // Second "Position" header row (within NFT subsection) — skip
    if (lowerFull === "position") {
      if (results.length > 0) inNftSubsection = true;
      continue;
    }
    if (rawFull.includes("#")) continue;

    const exitType = lowerFull.includes("(exit)") ? "exit" as const
                   : lowerFull.includes("(trim)") ? "trim" as const
                   : "unknown" as const;
    const ticker = rawFull.replace(/\s*\([^)]*\)\s*$/, "").trim().toUpperCase();
    if (!ticker || ticker.length > 20) continue;

    // Pattern-detect right-table values by scanning each row independently
    const dates: number[]   = [];
    const pcts: number[]    = [];
    let gainUsdCol           = -1;
    let exitFdvVal           = "";
    let blockchain           = "";

    for (let c = scanStart; c < row.length; c++) {
      const v = row[c]?.trim();
      if (!v || !isValue(v)) continue;

      if (isDate(v)) {
        dates.push(c);
      } else if (v.includes("%")) {
        pcts.push(c);
      } else if (v.includes("$")) {
        if (isFdv(v)) {
          if (!exitFdvVal) exitFdvVal = v;
        } else {
          gainUsdCol = c;
        }
      } else if (!blockchain && !/^\d+(\.\d+)?$/.test(v)) {
        blockchain = v;
      }
    }

    // Cost basis ETH: plain decimal number immediately before the first ROI% column
    let costBasisEth = 0;
    if (pcts.length > 0) {
      for (let c = pcts[0] - 1; c >= scanStart; c--) {
        const v = row[c]?.trim();
        if (!v) continue;
        if (/^\d+(\.\d+)?$/.test(v)) costBasisEth = parseNumber(v);
        break; // first non-empty cell before roiEth
      }
    }

    results.push({
      ticker,
      exitType,
      tokensSold:     parseNumber(row[tokensSoldIdx]),
      tokenPrice:     parseNumber(row[tokenPriceIdx]),
      ethValue:       parseNumber(row[ethValueIdx]),
      marketValueUsd: parseNumber(row[marketValIdx]),
      investmentDate: dates[0] !== undefined ? (row[dates[0]]?.trim() ?? "") : "",
      exitDate:       dates[1] !== undefined ? (row[dates[1]]?.trim() ?? "") : "",
      exitFdv:        exitFdvVal,
      blockchain,
      costBasisEth,
      roiEthPct:      pcts.length >= 2 ? parseNumber(row[pcts[pcts.length - 2]]) : (pcts.length === 1 ? parseNumber(row[pcts[0]]) : 0),
      roiUsdPct:      pcts.length >= 1 ? parseNumber(row[pcts[pcts.length - 1]]) : 0,
      gainUsd:        gainUsdCol >= 0 ? parseNumber(row[gainUsdCol]) : 0,
      ...(inNftSubsection ? { isNft: true } : {}),
    });
  }
  return results;
}

// Collect ALL "Benchmark (ETH) Return" values starting from minCol (to skip noise columns)
function parseAllBenchmarkReturns(data: string[][], minCol = 0): number[] {
  const results: number[] = [];
  for (const row of data) {
    for (let j = minCol; j < row.length; j++) {
      const cell = row[j]?.trim().toLowerCase() ?? "";
      if (cell.includes("benchmark") && cell.includes("eth")) {
        for (let k = j + 1; k < row.length; k++) {
          const v = row[k]?.trim();
          if (v && isValue(v) && v.includes("%")) {
            results.push(parseNumber(v));
            break;
          }
        }
      }
    }
  }
  return results;
}

function parseBenchmarkReturn(data: string[][]): number | null {
  for (const row of data) {
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]?.trim().toLowerCase() ?? "";
      if (cell.includes("benchmark") && cell.includes("eth")) {
        for (let k = j + 1; k < row.length; k++) {
          const v = row[k]?.trim();
          if (v && isValue(v) && v.includes("%")) return parseNumber(v);
        }
        // no value in this row — keep scanning for another Benchmark row
      }
    }
  }
  return null;
}

export async function fetchSheetsData(): Promise<{
  schools: SchoolRowWithHoldings[];
  sinceInceptionSchools: SchoolRow[];
  schools2425: SchoolRow[];
  schools2324: SchoolRow[];
  daoReturnEth2526: number | null;
  daoReturnEthAllTime: number | null;
  daoReturnEth2425: number | null;
  daoReturnEth2324: number | null;
  fetchedAt: string;
}> {
  // 1. Fetch leaderboard tabs in parallel
  const [leaderboardData, data2425, data2324] = await Promise.all([
    fetchGvizCsv("LEADERBOARD"),
    fetchGvizCsv("'24-'25 Standings"),
    fetchGvizCsv("'23-'24 Standings"),
  ]);
  const leaderboardEntries = parseLeaderboard(leaderboardData);
  const sinceInceptionEntries = parseSinceInception(leaderboardData);

  // LEADERBOARD tab benchmark rows: first = current year (2025-2026), second = All-Time (if present)
  const leaderboardBenchmarks = parseAllBenchmarkReturns(leaderboardData, 0);
  const daoReturnEth2526 = leaderboardBenchmarks[0] ?? null;
  const daoReturnEthAllTime = leaderboardBenchmarks[1] ?? null;

  // '24-'25 tab has explicit "Benchmark (ETH) Return" label
  const daoReturnEth2425 = parseBenchmarkReturn(data2425);       // 59.56%

  // '23-'24 tab has no benchmark label — value is at col[10] of "Invested Capital (ETH)" row
  let daoReturnEth2324 = parseBenchmarkReturn(data2324);
  if (daoReturnEth2324 === null) {
    for (const row of data2324) {
      if (row[1]?.trim().toLowerCase().includes("invested capital (eth)")) {
        for (let c = 8; c <= 13; c++) {
          const v = row[c]?.trim();
          if (v && isValue(v) && v.includes("%")) { daoReturnEth2324 = parseNumber(v); break; }
        }
        if (daoReturnEth2324 !== null) break;
      }
    }
  }

  if (leaderboardEntries.length === 0) {
    return { schools: [], sinceInceptionSchools: [], schools2425: [], schools2324: [], daoReturnEth2526, daoReturnEthAllTime, daoReturnEth2425, daoReturnEth2324, fetchedAt: new Date().toISOString() };
  }

  // 2. Fetch holdings for each school in parallel
  const schoolsWithHoldings = await Promise.all(
    leaderboardEntries.map(async (entry) => {
      const tabData = await fetchSchoolTabCsv(entry.name);
      const holdings = parseHoldings(tabData);
      const exitedHoldings = parseExitedHoldings(tabData);
      const nftHoldings = parseNftHoldings(tabData);
      // gviz skips leading blank/logo rows, so relative CSV index is stable across all school tabs.
      // Index 10 col M = spreadsheet M20 = Quarterly Sub DAO Return (USD).
      // Index 12 col M = spreadsheet M22 = Quarterly Sub DAO Outperformance (ETH).
      const quarterlyUsdReturn = isValue(tabData[10]?.[12]) ? parseNumber(tabData[10][12]) : 0;
      const quarterlyEthReturn = isValue(tabData[12]?.[12]) ? parseNumber(tabData[12][12]) : 0;
      return { ...entry, holdings, exitedHoldings, nftHoldings, quarterlyUsdReturn, quarterlyEthReturn };
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
      quarterlyUsdReturn: s.quarterlyUsdReturn,
      quarterlyEthReturn: s.quarterlyEthReturn,
      holdings: s.holdings,
      exitedHoldings: s.exitedHoldings,
      nftHoldings: s.nftHoldings,
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

  // 5. Parse historical year leaderboards
  function buildHistoricalRows(data: string[][]): SchoolRow[] {
    const entries = parseHistoricalLeaderboard(data);
    return entries.map((e) => {
      const displayName = tabToDisplayName(e.name);
      const existing = nameToDisplay.get(displayName.toLowerCase());
      return {
        rank: e.rank,
        name: displayName,
        slug: existing?.slug ?? slugify(displayName),
        nav: e.nav,
        usdReturn: e.usdReturn,
        ethReturn: e.ethReturn,
        avgEntryFdv: e.avgEntryFdv,
        pctDeployed: e.pctDeployed,
      };
    }).sort((a, b) => a.rank - b.rank);
  }

  const schools2425 = buildHistoricalRows(data2425);
  const schools2324 = buildHistoricalRows(data2324);

  return { schools, sinceInceptionSchools, schools2425, schools2324, daoReturnEth2526, daoReturnEthAllTime, daoReturnEth2425, daoReturnEth2324, fetchedAt: new Date().toISOString() };
}
