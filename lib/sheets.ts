import Papa from "papaparse";
import { SchoolRow, Holding } from "@/lib/types";
export type { Holding } from "@/lib/types";
import { slugify } from "@/lib/utils";

const PUB_BASE =
  process.env.GOOGLE_SHEETS_CSV_URL?.replace(/[?&]output=csv.*$/, "") ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT-2qpQGoL6IgPXUCMJRzB5ThYKqHbJ_txIWPIbfFKzT2xWOk_uh2K0I5KDG_pAYeqJI_swfAN3Uk6i/pub";

const LEADERBOARD_GID = "1652810239";

const SKIP_NAMES = new Set([
  "LEADERBOARD",
  "'24-'25 STANDINGS",
  "'23-'24 STANDINGS",
  "24-25 STANDINGS",
  "23-24 STANDINGS",
]);
const ARCHIVED_PREFIX = "[ARCHIVED]";

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
  if (s.includes("#VALUE!") || s.includes("#REF!") || s.includes("Please sign in"))
    return false;
  return true;
}

async function discoverTabs(): Promise<{ name: string; gid: string }[]> {
  const res = await fetch(PUB_BASE, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Failed to fetch pub page: ${res.status}`);
  const html = await res.text();
  const chunks = html.split("items.push");
  const matches: [string, string][] = [];
  for (const chunk of chunks) {
    const nameMatch = chunk.match(/name:\s*"([^"]+)"/);
    const gidMatch = chunk.match(/gid:\s*"(\d+)"/);
    if (nameMatch && gidMatch) matches.push([nameMatch[1], gidMatch[1]]);
  }
  return matches.map(([name, gid]) => ({ name, gid }));
}

async function fetchCsv(gid: string): Promise<string[][]> {
  const url = `${PUB_BASE}?output=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  if (!res.ok) return [];
  const text = await res.text();
  if (text.trimStart().startsWith("<")) return [];
  const { data } = Papa.parse<string[]>(text);
  return data;
}

function parseLeaderboard(data: string[][]): SchoolRow[] {
  let colHeaderIdx = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const joined = row.join(",").toLowerCase();
    if (joined.includes("sub dao") && joined.includes("rank") && joined.includes("nav")) {
      colHeaderIdx = i;
      break;
    }
  }
  if (colHeaderIdx === -1) return [];

  const headers = data[colHeaderIdx].map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes("sub dao") || h.includes("school"));
  const rankIdx = headers.findIndex((h) => h === "rank");
  const navIdx = headers.findIndex((h) => h === "nav");
  const usdIdx = headers.findIndex((h) => h.includes("total return (usd)") || h.includes("return (usd)"));
  const ethIdx = headers.findIndex((h) => h.includes("total return (eth)") || h.includes("return (eth)"));
  const fdvIdx = headers.findIndex((h) => h.includes("entry fdv") || h.includes("avg entry"));
  const depIdx = headers.findIndex((h) => h.includes("deployed"));

  const schools: SchoolRow[] = [];
  let rank = 1;

  for (let i = colHeaderIdx + 1; i < data.length; i++) {
    const row = data[i];
    const rawName = nameIdx >= 0 ? row[nameIdx]?.trim() : row[1]?.trim();
    if (!rawName) continue;
    if (rawName.toLowerCase().includes("member school") || rawName.toLowerCase().includes("position highlights")) break;

    schools.push({
      rank: isValue(row[rankIdx]) ? parseNumber(row[rankIdx]) || rank : rank,
      name: rawName,
      slug: slugify(rawName),
      nav: navIdx >= 0 && isValue(row[navIdx]) ? parseNumber(row[navIdx]) : 0,
      usdReturn: usdIdx >= 0 && isValue(row[usdIdx]) ? parseNumber(row[usdIdx]) : 0,
      ethReturn: ethIdx >= 0 && isValue(row[ethIdx]) ? parseNumber(row[ethIdx]) : 0,
      avgEntryFdv: fdvIdx >= 0 && isValue(row[fdvIdx]) ? parseNumber(row[fdvIdx]) : 0,
      pctDeployed: depIdx >= 0 && isValue(row[depIdx]) ? parseNumber(row[depIdx]) : 0,
    });
    rank++;
  }

  return schools;
}

function parseHoldings(data: string[][]): Holding[] {
  let colHeaderIdx = -1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row.some((c) => c?.trim() === "Liquid Positions")) {
      for (let j = i + 1; j < Math.min(i + 4, data.length); j++) {
        if (data[j].some((c) => c?.trim() === "Position") && data[j].some((c) => c?.trim() === "Tokens")) {
          colHeaderIdx = j;
          break;
        }
      }
      if (colHeaderIdx !== -1) break;
    }
    if (row.some((c) => c?.trim() === "Position") && row.some((c) => c?.trim() === "Tokens") && row.some((c) => c?.trim() === "Price")) {
      const prevRows = data.slice(Math.max(0, i - 5), i);
      const precedingNFT = prevRows.some((r) => r.some((c) => c?.trim() === "NFT Positions"));
      const precedingExited = prevRows.some((r) => r.some((c) => c?.trim()?.includes("Exited")));
      if (!precedingNFT && !precedingExited) {
        colHeaderIdx = i;
        break;
      }
    }
  }

  if (colHeaderIdx === -1) return [];

  const headers = data[colHeaderIdx].map((h) => h?.trim().toLowerCase());
  const posIdx = headers.findIndex((h) => h === "position");
  const tokensIdx = headers.findIndex((h) => h === "tokens");
  const pctIdx = headers.findIndex((h) => h.includes("% of sub dao") || h.includes("% of portfolio"));
  const chainIdx = headers.findIndex((h) => h === "blockchain");
  const fdvIdx = headers.findIndex((h) => h.includes("entry fdv"));
  const costIdx = headers.findIndex((h) => h.includes("cost basis (eth)"));
  const dateIdx = headers.findIndex((h) => h.includes("investment date"));

  const holdings: Holding[] = [];

  for (let i = colHeaderIdx + 1; i < data.length; i++) {
    const row = data[i];
    const rawTicker = posIdx >= 0 ? row[posIdx]?.trim() : "";
    if (!rawTicker) continue;
    if (
      rawTicker === "NFT Positions" ||
      rawTicker === "Liquid Positions (Exited/Trimmed)" ||
      rawTicker.startsWith("Member") ||
      rawTicker === "Position"
    ) break;
    if (rawTicker.includes("#") || rawTicker.length > 20) continue;

    holdings.push({
      ticker: rawTicker.toUpperCase(),
      blockchain: chainIdx >= 0 ? (row[chainIdx]?.trim() || "") : "",
      tokens: tokensIdx >= 0 && isValue(row[tokensIdx]) ? parseNumber(row[tokensIdx]) : 0,
      entryFdv: fdvIdx >= 0 && isValue(row[fdvIdx]) ? row[fdvIdx]?.trim() || "" : "",
      costBasisEth: costIdx >= 0 && isValue(row[costIdx]) ? parseNumber(row[costIdx]) : 0,
      pctOfPortfolio: pctIdx >= 0 && isValue(row[pctIdx]) ? parseNumber(row[pctIdx]) : 0,
      investmentDate: dateIdx >= 0 && isValue(row[dateIdx]) ? row[dateIdx]?.trim() || "" : "",
    });
  }

  return holdings;
}

const normalize = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();

export async function fetchSheetsData(): Promise<{
  schools: SchoolRowWithHoldings[];
  fetchedAt: string;
}> {
  const [tabs, leaderboardData] = await Promise.all([
    discoverTabs(),
    fetchCsv(LEADERBOARD_GID),
  ]);

  let schools = parseLeaderboard(leaderboardData);

  // If every school has nav=0 the leaderboard response was transient (e.g.
  // Google Sheets returning "Loading..." for formula cells mid-recalculation).
  // Retry once immediately — the second fetch almost always has real values.
  if (schools.length > 0 && schools.every((s) => s.nav === 0)) {
    const retryData = await fetchCsv(LEADERBOARD_GID);
    const retrySchools = parseLeaderboard(retryData);
    if (retrySchools.some((s) => s.nav !== 0)) schools = retrySchools;
  }

  const schoolTabs = tabs.filter(({ name }) => {
    const upper = name.toUpperCase();
    return (
      !SKIP_NAMES.has(upper) &&
      !upper.startsWith(ARCHIVED_PREFIX) &&
      !upper.startsWith("[ARCHIVED]") &&
      !upper.includes("STANDINGS")
    );
  });

  const tabResults = await Promise.all(
    schoolTabs.map(async ({ name, gid }) => {
      const data = await fetchCsv(gid);
      return { name: name.toUpperCase(), holdings: parseHoldings(data) };
    })
  );

  const holdingsMap = new Map<string, Holding[]>();
  for (const { name, holdings } of tabResults) {
    holdingsMap.set(normalize(name), holdings);
  }

  const schoolsWithHoldings: SchoolRowWithHoldings[] = schools.map((school) => {
    const key = normalize(school.name);
    const holdings =
      holdingsMap.get(key) ||
      (Array.from(holdingsMap.entries()).find(([k]) => k.includes(key) || key.includes(k))?.[1]) ||
      [];
    return { ...school, holdings };
  });

  return { schools: schoolsWithHoldings, fetchedAt: new Date().toISOString() };
}
