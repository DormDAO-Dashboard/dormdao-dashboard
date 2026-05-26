import Papa from "papaparse";
import { SchoolRow, Holding } from "@/lib/types";
export type { Holding } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { TICKER_TO_COINGECKO } from "@/lib/tokens";

const PUB_BASE =
  process.env.GOOGLE_SHEETS_CSV_URL?.replace(/[?&]output=csv.*$/, "") ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT-2qpQGoL6IgPXUCMJRzB5ThYKqHbJ_txIWPIbfFKzT2xWOk_uh2K0I5KDG_pAYeqJI_swfAN3Uk6i/pub";

const SKIP_NAMES = new Set([
  "LEADERBOARD",
  "'24-'25 STANDINGS",
  "'23-'24 STANDINGS",
  "24-25 STANDINGS",
  "23-24 STANDINGS",
]);

// Decode JavaScript string hex/unicode escapes that Google Sheets embeds in its HTML,
// e.g. \x5b → [ and \x5d → ] so that "[ARCHIVED]" tabs are filtered correctly.
function decodeJsStringEscapes(s: string): string {
  return s
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function isArchivedTab(name: string): boolean {
  return name.toUpperCase().includes("ARCHIVED");
}

// Known tab names that need special display-name handling
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

async function discoverTabs(): Promise<{ name: string; gid: string }[]> {
  const res = await fetch(PUB_BASE, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Failed to fetch pub page: ${res.status}`);
  const html = await res.text();
  const chunks = html.split("items.push");
  const matches: [string, string][] = [];
  for (const chunk of chunks) {
    const nameMatch = chunk.match(/name:\s*"([^"]+)"/);
    const gidMatch = chunk.match(/gid:\s*"(\d+)"/);
    if (nameMatch && gidMatch) matches.push([decodeJsStringEscapes(nameMatch[1]), gidMatch[1]]);
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

// Parse the "Sub DAO Summary" block from a school tab.
// This block contains the authoritative invested capital and deployment stats.
interface SchoolSummary {
  investedEth: number;
  investedUsd: number;
  pctDeployed: number;
  avgEntryFdv: number;
  sheetNav: number | null;
}

function parseSchoolSummary(data: string[][]): SchoolSummary {
  let investedEth = 0;
  let investedUsd = 0;
  let pctDeployed = 0;
  let avgEntryFdv = 0;
  let sheetNav: number | null = null;

  for (const row of data) {
    const label = (row[1]?.trim() ?? "").toLowerCase();
    const value = row[4]?.trim() ?? "";

    if (label === "liquid positions") break;

    if (isValue(value)) {
      if (label === "invested capital (eth)") investedEth = parseNumber(value);
      else if (label === "invested capital (usd)") investedUsd = parseNumber(value);
      else if (label === "% deployed") pctDeployed = parseNumber(value);
      else if (label === "average entry fdv") avgEntryFdv = parseNumber(value);
      else if (label === "total sub dao nav") sheetNav = parseNumber(value);
    }
  }

  return { investedEth, investedUsd, pctDeployed, avgEntryFdv, sheetNav };
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

const GECKO_BATCH_SIZE = 20;

async function fetchGeckoPrices(geckoIds: string[]): Promise<Record<string, number>> {
  if (!geckoIds.length) return {};

  const batches: string[][] = [];
  for (let i = 0; i < geckoIds.length; i += GECKO_BATCH_SIZE) {
    batches.push(geckoIds.slice(i, i + GECKO_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${batch.join(",")}&vs_currencies=usd`,
          { next: { revalidate: 60 } }
        );
        if (!res.ok) return {};
        const data: Record<string, { usd: number }> = await res.json();
        return Object.fromEntries(Object.entries(data).map(([id, v]) => [id, v.usd ?? 0]));
      } catch {
        return {};
      }
    })
  );

  return Object.assign({}, ...results);
}

export async function fetchSheetsData(): Promise<{
  schools: SchoolRowWithHoldings[];
  fetchedAt: string;
}> {
  // 1. Discover tabs and filter to school tabs only
  const tabs = await discoverTabs();
  const schoolTabs = tabs.filter(({ name }) => {
    const upper = name.toUpperCase().trim();
    return (
      !SKIP_NAMES.has(upper) &&
      !isArchivedTab(name) &&
      !upper.includes("STANDINGS") &&
      !upper.includes("LEADERBOARD") &&
      !upper.includes("SUMMARY")
    );
  });

  // 2. Fetch all school tabs in parallel — each tab has its own summary + holdings
  const tabResults = await Promise.all(
    schoolTabs.map(async ({ name, gid }) => {
      const data = await fetchCsv(gid);
      const summary = parseSchoolSummary(data);
      const holdings = parseHoldings(data);
      return { name, summary, holdings };
    })
  );

  // 3. Collect all CoinGecko IDs needed, including ETH for return calculations
  const geckoIdSet = new Set(["ethereum"]);
  for (const { holdings } of tabResults) {
    for (const h of holdings) {
      const id = TICKER_TO_COINGECKO[h.ticker];
      if (id) geckoIdSet.add(id);
    }
  }
  const priceMap = await fetchGeckoPrices([...geckoIdSet]);
  const ethPrice = priceMap["ethereum"] ?? 0;

  // 4. Compute each school's metrics — prefer sheet-provided values, fall back to live computation
  const schools: SchoolRowWithHoldings[] = tabResults
    .filter(({ name, holdings }) => holdings.length > 0 && !isArchivedTab(name))
    .map(({ name, summary, holdings }) => {
      // Compute NAV from holdings × live prices as a fallback
      let computedNav = 0;
      for (const h of holdings) {
        const geckoId = TICKER_TO_COINGECKO[h.ticker];
        const price = geckoId ? (priceMap[geckoId] ?? 0) : 0;
        computedNav += h.tokens * price;
      }

      // Prefer the sheet's pre-computed NAV; fall back to live computation
      const nav = summary.sheetNav !== null && summary.sheetNav > 0
        ? summary.sheetNav
        : computedNav;

      // ETH return: always compute from live holdings × prices vs invested ETH
      let ethReturn = 0;
      if (computedNav > 0 && ethPrice > 0 && summary.investedEth > 0) {
        const navEth = computedNav / ethPrice;
        ethReturn = ((navEth - summary.investedEth) / summary.investedEth) * 100;
      }

      // USD return: always compute from NAV vs invested USD
      let usdReturn = 0;
      if (nav > 0 && summary.investedUsd > 0) {
        usdReturn = ((nav - summary.investedUsd) / summary.investedUsd) * 100;
      }

      return {
        rank: 0,
        name: tabToDisplayName(name),
        slug: slugify(tabToDisplayName(name)),
        nav,
        usdReturn,
        ethReturn,
        avgEntryFdv: summary.avgEntryFdv,
        pctDeployed: summary.pctDeployed,
        holdings,
      };
    });

  // 5. Rank by NAV descending
  schools.sort((a, b) => b.nav - a.nav);
  schools.forEach((s, i) => { s.rank = i + 1; });

  return { schools, fetchedAt: new Date().toISOString() };
}
