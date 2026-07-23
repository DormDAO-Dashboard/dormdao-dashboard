"use client";
import { useState, useEffect } from "react";
import { ActivityClient } from "@/components/ActivityClient";
import { SchoolRowWithHoldings } from "@/lib/cache";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all",  label: "All Activity" },
  { key: "buys", label: "Position Entries" },
  { key: "sells", label: "Trims & Exits" },
  { key: "nfts", label: "NFT Activity" },
] as const;

type Tab = (typeof TABS)[number]["key"];

const YEAR_TABS = [
  { key: "all",  label: "All Time",   start: 0,                                    end: Infinity },
  { key: "2526", label: "2025–2026",  start: new Date("2025-10-01").getTime(),     end: new Date("2026-10-01").getTime() },
  { key: "2425", label: "2024–2025",  start: new Date("2024-10-01").getTime(),     end: new Date("2025-10-01").getTime() },
  { key: "2324", label: "2023–2024",  start: new Date("2023-10-01").getTime(),     end: new Date("2024-10-01").getTime() },
] as const;

type YearKey = (typeof YEAR_TABS)[number]["key"];

function toMs(d: string): number {
  if (!d) return 0;
  const [y, m, day] = d.replace(/-/g, "/").split("/").map(Number);
  return y && m && day ? new Date(y, m - 1, day).getTime() : 0;
}

function AllExits({ schools, yearStart, yearEnd }: { schools: SchoolRowWithHoldings[]; yearStart: number; yearEnd: number }) {
  const [schoolFilter, setSchoolFilter] = useState("");

  useEffect(() => { setSchoolFilter(""); }, [yearStart, yearEnd]);

  const rows = schools
    .filter((s) => !schoolFilter || s.name === schoolFilter)
    .flatMap((s) =>
      (s.exitedHoldings ?? []).filter(h => !h.isNft).map((h) => ({ ...h, schoolName: s.name, schoolSlug: s.slug }))
    )
    .filter((h) => {
      const ms = toMs(h.exitDate);
      if (!ms) return false;
      if (yearStart === 0) return true;
      return ms >= yearStart && ms < yearEnd;
    })
    .sort((a, b) => {
      const da = toMs(a.exitDate);
      const db = toMs(b.exitDate);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });

  const schoolsInYear = [...new Set(rows.map((r) => r.schoolName))].sort();

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-300">All Exited &amp; Trimmed Positions</h2>
          <span className="text-xs text-gray-600">{rows.length} total</span>
        </div>
        {schoolsInYear.length > 0 && (
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Schools</option>
            {schoolsInYear.map((name) => (
              <option key={name} value={name}>{schoolDisplayName(name)}</option>
            ))}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">No exits recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500">
                <th className="text-left px-5 py-3">School</th>
                <th className="text-left px-5 py-3">Token</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-right px-5 py-3">Cost Basis (ETH)</th>
                <th className="text-right px-5 py-3">Gain (USD)</th>
                <th className="text-right px-5 py-3">ROI (ETH)</th>
                <th className="text-right px-5 py-3">ROI (USD)</th>
                <th className="text-right px-5 py-3">Invested</th>
                <th className="text-right px-5 py-3">Exited</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h, i) => {
                const up = (v: number) => v >= 0;
                return (
                  <tr key={`${h.schoolName}-${h.ticker}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/schools/${h.schoolSlug}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <SchoolLogo name={h.schoolName} size={20} />
                        <span className="text-gray-300 text-xs">{schoolDisplayName(h.schoolName)}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/tokens/${h.ticker.toLowerCase()}`}
                        className="font-mono font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors"
                      >
                        ${h.ticker}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {h.exitType === "exit" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger/20 text-danger border border-danger/30">Exit</span>
                      ) : h.exitType === "trim" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30">Trim</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-400 text-xs">
                      {h.costBasisEth !== 0 ? `${h.costBasisEth.toFixed(3)} ETH` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {h.gainUsd !== 0 ? (
                        <span className={up(h.gainUsd) ? "text-primary" : "text-danger"}>
                          {up(h.gainUsd) ? "+" : ""}{h.gainUsd >= 1000 || h.gainUsd <= -1000
                            ? `$${(h.gainUsd / 1000).toFixed(1)}k`
                            : `$${h.gainUsd.toFixed(0)}`}
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {h.roiEthPct !== 0 ? (
                        <span className={up(h.roiEthPct) ? "text-primary" : "text-danger"}>
                          {up(h.roiEthPct) ? "+" : ""}{h.roiEthPct.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {h.roiUsdPct !== 0 ? (
                        <span className={up(h.roiUsdPct) ? "text-primary" : "text-danger"}>
                          {up(h.roiUsdPct) ? "+" : ""}{h.roiUsdPct.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">{h.investmentDate || "—"}</td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">{h.exitDate || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NftActivity({ schools, yearStart, yearEnd }: { schools: SchoolRowWithHoldings[]; yearStart: number; yearEnd: number }) {
  const [schoolFilter, setSchoolFilter] = useState("");
  useEffect(() => { setSchoolFilter(""); }, [yearStart, yearEnd]);

  const inRange = (ms: number, isEntry: boolean) => {
    if (yearStart === 0) return isEntry ? true : ms > 0;
    if (!ms) return false;
    return ms >= yearStart && ms < yearEnd;
  };

  const entryRows = schools
    .filter(s => !schoolFilter || s.name === schoolFilter)
    .flatMap(s => (s.nftHoldings ?? []).map(h => ({ ...h, schoolName: s.name, schoolSlug: s.slug })))
    .filter(h => inRange(toMs(h.investmentDate), true))
    .sort((a, b) => toMs(b.investmentDate) - toMs(a.investmentDate));

  const exitRows = schools
    .filter(s => !schoolFilter || s.name === schoolFilter)
    .flatMap(s =>
      (s.exitedHoldings ?? []).filter(h => h.isNft).map(h => ({ ...h, schoolName: s.name, schoolSlug: s.slug }))
    )
    .filter(h => inRange(toMs(h.exitDate), false))
    .sort((a, b) => toMs(b.exitDate) - toMs(a.exitDate));

  const allSchools = [...new Set([
    ...entryRows.map(r => r.schoolName),
    ...exitRows.map(r => r.schoolName),
  ])].sort();

  if (entryRows.length === 0 && exitRows.length === 0) {
    return <p className="text-center py-8 text-sm text-gray-500">No NFT activity in this period.</p>;
  }

  return (
    <div className="space-y-6">
      {allSchools.length > 1 && (
        <div>
          <select
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Schools</option>
            {allSchools.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}

      {entryRows.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Active NFT Holdings</h2>
            <span className="text-xs text-gray-600">{entryRows.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-5 py-3">School</th>
                  <th className="text-left px-5 py-3">NFT</th>
                  <th className="text-right px-5 py-3">Cost (ETH)</th>
                  <th className="text-right px-5 py-3">Value (USD)</th>
                  <th className="text-right px-5 py-3">ROI (ETH)</th>
                  <th className="text-right px-5 py-3">ROI (USD)</th>
                  <th className="text-right px-5 py-3">Purchased</th>
                </tr>
              </thead>
              <tbody>
                {entryRows.map((h, i) => (
                  <tr key={`${h.schoolSlug}-${h.ticker}-${h.investmentDate}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/schools/${h.schoolSlug}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                        <SchoolLogo name={h.schoolName} size={20} />
                        <span className="text-gray-300 text-xs">{schoolDisplayName(h.schoolName)}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold text-gray-900 dark:text-white">{h.ticker}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-400 text-xs">
                      {h.costBasisEth > 0 ? `${h.costBasisEth.toFixed(3)} ETH` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300 text-xs">
                      {h.marketValueUsd ? `$${h.marketValueUsd.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {h.roiEthPct !== undefined && h.roiEthPct !== 0 ? (
                        <span className={h.roiEthPct >= 0 ? "text-primary" : "text-danger"}>
                          {h.roiEthPct >= 0 ? "+" : ""}{h.roiEthPct.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {h.roiUsdPct !== undefined && h.roiUsdPct !== 0 ? (
                        <span className={h.roiUsdPct >= 0 ? "text-primary" : "text-danger"}>
                          {h.roiUsdPct >= 0 ? "+" : ""}{h.roiUsdPct.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">{h.investmentDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {exitRows.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Exited NFT Positions</h2>
            <span className="text-xs text-gray-600">{exitRows.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-5 py-3">School</th>
                  <th className="text-left px-5 py-3">NFT</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-right px-5 py-3">Cost Basis (ETH)</th>
                  <th className="text-right px-5 py-3">Gain (USD)</th>
                  <th className="text-right px-5 py-3">ROI (ETH)</th>
                  <th className="text-right px-5 py-3">ROI (USD)</th>
                  <th className="text-right px-5 py-3">Invested</th>
                  <th className="text-right px-5 py-3">Exited</th>
                </tr>
              </thead>
              <tbody>
                {exitRows.map((h, i) => {
                  const up = (v: number) => v >= 0;
                  return (
                    <tr key={`${h.schoolSlug}-${h.ticker}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/schools/${h.schoolSlug}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                          <SchoolLogo name={h.schoolName} size={20} />
                          <span className="text-gray-300 text-xs">{schoolDisplayName(h.schoolName)}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono font-semibold text-gray-900 dark:text-white">{h.ticker}</td>
                      <td className="px-5 py-3">
                        {h.exitType === "exit" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger/20 text-danger border border-danger/30">Exit</span>
                        ) : h.exitType === "trim" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30">Trim</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-400 text-xs">
                        {h.costBasisEth !== 0 ? `${h.costBasisEth.toFixed(3)} ETH` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {h.gainUsd !== 0 ? (
                          <span className={up(h.gainUsd) ? "text-primary" : "text-danger"}>
                            {up(h.gainUsd) ? "+" : ""}{h.gainUsd >= 1000 || h.gainUsd <= -1000
                              ? `$${(h.gainUsd / 1000).toFixed(1)}k`
                              : `$${h.gainUsd.toFixed(0)}`}
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {h.roiEthPct !== 0 ? (
                          <span className={up(h.roiEthPct) ? "text-primary" : "text-danger"}>
                            {up(h.roiEthPct) ? "+" : ""}{h.roiEthPct.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {h.roiUsdPct !== 0 ? (
                          <span className={up(h.roiUsdPct) ? "text-primary" : "text-danger"}>
                            {up(h.roiUsdPct) ? "+" : ""}{h.roiUsdPct.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 text-xs">{h.investmentDate || "—"}</td>
                      <td className="px-5 py-3 text-right text-gray-500 text-xs">{h.exitDate || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

type ActionType = "buy" | "trim" | "exit";

interface UnifiedRow {
  schoolName: string;
  schoolSlug: string;
  ticker: string;
  actionType: ActionType;
  isNft: boolean;
  date: string;
  dateMs: number;
  costBasisEth: number;
  gainUsd?: number;
  roiEthPct?: number;
  roiUsdPct?: number;
}

function ActionBadge({ type, isNft }: { type: ActionType; isNft: boolean }) {
  const cls =
    type === "buy"  ? "bg-primary/20 text-primary border-primary/30" :
    type === "exit" ? "bg-danger/20 text-danger border-danger/30" :
                     "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30";
  const label = type === "buy" ? (isNft ? "NFT Buy" : "Buy") :
                type === "exit" ? (isNft ? "NFT Exit" : "Exit") :
                (isNft ? "NFT Trim" : "Trim");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function AllActivity({ schools, yearStart, yearEnd }: { schools: SchoolRowWithHoldings[]; yearStart: number; yearEnd: number }) {
  const [schoolFilter, setSchoolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ActionType | "nft">("");

  useEffect(() => { setSchoolFilter(""); setTypeFilter(""); }, [yearStart, yearEnd]);

  const inRange = (ms: number) => {
    if (!ms) return false;
    if (yearStart === 0) return true;
    return ms >= yearStart && ms < yearEnd;
  };

  const rows: UnifiedRow[] = [
    // Token buys (active holdings, excluding ETH)
    ...schools.flatMap(s =>
      (s.holdings ?? [])
        .filter(h => h.ticker !== "ETH")
        .map(h => ({
          schoolName: s.name, schoolSlug: s.slug,
          ticker: h.ticker, actionType: "buy" as ActionType,
          isNft: false,
          date: h.investmentDate || "",
          dateMs: toMs(h.investmentDate),
          costBasisEth: h.costBasisEth,
          gainUsd: h.gainUsd,
          roiEthPct: h.roiEthPct,
          roiUsdPct: h.roiUsdPct,
        }))
    ),
    // Token exits & trims
    ...schools.flatMap(s =>
      (s.exitedHoldings ?? [])
        .filter(h => !h.isNft)
        .map(h => ({
          schoolName: s.name, schoolSlug: s.slug,
          ticker: h.ticker,
          actionType: (h.exitType === "trim" ? "trim" : "exit") as ActionType,
          isNft: false,
          date: h.exitDate || "",
          dateMs: toMs(h.exitDate),
          costBasisEth: h.costBasisEth,
          gainUsd: h.gainUsd,
          roiEthPct: h.roiEthPct,
          roiUsdPct: h.roiUsdPct,
        }))
    ),
    // NFT buys (active)
    ...schools.flatMap(s =>
      (s.nftHoldings ?? []).map(h => ({
        schoolName: s.name, schoolSlug: s.slug,
        ticker: h.ticker, actionType: "buy" as ActionType,
        isNft: true,
        date: h.investmentDate || "",
        dateMs: toMs(h.investmentDate),
        costBasisEth: h.costBasisEth,
        gainUsd: h.gainUsd,
        roiEthPct: h.roiEthPct,
        roiUsdPct: h.roiUsdPct,
      }))
    ),
    // NFT exits & trims
    ...schools.flatMap(s =>
      (s.exitedHoldings ?? [])
        .filter(h => h.isNft)
        .map(h => ({
          schoolName: s.name, schoolSlug: s.slug,
          ticker: h.ticker,
          actionType: (h.exitType === "trim" ? "trim" : "exit") as ActionType,
          isNft: true,
          date: h.exitDate || "",
          dateMs: toMs(h.exitDate),
          costBasisEth: h.costBasisEth,
          gainUsd: h.gainUsd,
          roiEthPct: h.roiEthPct,
          roiUsdPct: h.roiUsdPct,
        }))
    ),
  ]
    .filter(r => inRange(r.dateMs))
    .filter(r => !schoolFilter || r.schoolName === schoolFilter)
    .filter(r => {
      if (!typeFilter) return true;
      if (typeFilter === "nft") return r.isNft;
      return r.actionType === typeFilter && !r.isNft;
    })
    .sort((a, b) => b.dateMs - a.dateMs);

  const allSchools = [...new Set(
    [...(schools.flatMap(s => [
      ...(s.holdings ?? []).map(() => s.name),
      ...(s.exitedHoldings ?? []).map(() => s.name),
      ...(s.nftHoldings ?? []).map(() => s.name),
    ]))]
  )].filter((v, i, a) => a.indexOf(v) === i).sort();

  const up = (v: number) => v >= 0;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-300">All Activity</h2>
          <span className="text-xs text-gray-600">{rows.length} events</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Schools</option>
            {allSchools.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Types</option>
            <option value="buy">Buys</option>
            <option value="trim">Trims</option>
            <option value="exit">Exits</option>
            <option value="nft">NFTs</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">No activity in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500">
                <th className="text-left px-5 py-3">School</th>
                <th className="text-left px-5 py-3">Token</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">Cost (ETH)</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">Gain (USD)</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">ROI (ETH)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.schoolSlug}-${r.ticker}-${i}`} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/schools/${r.schoolSlug}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                      <SchoolLogo name={r.schoolName} size={20} />
                      <div>
                        <div className="text-gray-300 text-xs">{schoolDisplayName(r.schoolName)}</div>
                        <div className="text-[10px] text-gray-600 md:hidden mt-0.5">{r.date || "—"}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono font-semibold text-gray-900 dark:text-white">${r.ticker}</td>
                  <td className="px-5 py-3">
                    <ActionBadge type={r.actionType} isNft={r.isNft} />
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500 text-xs hidden md:table-cell">{r.date || "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-400 text-xs hidden md:table-cell">
                    {r.costBasisEth > 0 ? `${r.costBasisEth.toFixed(3)} ETH` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs hidden md:table-cell">
                    {r.gainUsd !== undefined && r.gainUsd !== 0 ? (
                      <span className={up(r.gainUsd) ? "text-primary" : "text-danger"}>
                        {up(r.gainUsd) ? "+" : ""}
                        {Math.abs(r.gainUsd) >= 1000
                          ? `$${(r.gainUsd / 1000).toFixed(1)}k`
                          : `$${r.gainUsd.toFixed(0)}`}
                      </span>
                    ) : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs hidden md:table-cell">
                    {r.roiEthPct !== undefined && r.roiEthPct !== 0 ? (
                      <span className={up(r.roiEthPct) ? "text-primary" : "text-danger"}>
                        {up(r.roiEthPct) ? "+" : ""}{r.roiEthPct.toFixed(1)}%
                      </span>
                    ) : <span className="text-gray-700">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ActivityTabs({ schools }: { schools: SchoolRowWithHoldings[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [year, setYear] = useState<YearKey>("2526");

  const yearTab = YEAR_TABS.find((y) => y.key === year)!;

  return (
    <>
      {/* Year tabs */}
      <div className="flex overflow-x-auto gap-1.5 mb-4 pb-1 scrollbar-hide">
        {YEAR_TABS.map((y) => (
          <button
            key={y.key}
            onClick={() => setYear(y.key)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              year === y.key
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-transparent border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-600"
            )}
          >
            {y.label}
          </button>
        ))}
      </div>

      {/* Action tabs */}
      <div className="flex overflow-x-auto gap-1.5 mb-6 border-b border-gray-800 pb-0 scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 whitespace-nowrap px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-primary text-gray-900 dark:text-white font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-normal"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "all"  && <AllActivity schools={schools} yearStart={yearTab.start} yearEnd={yearTab.end} />}
      {tab === "buys" && <ActivityClient schools={schools} yearStart={yearTab.start} yearEnd={yearTab.end} />}
      {tab === "sells" && <AllExits schools={schools} yearStart={yearTab.start} yearEnd={yearTab.end} />}
      {tab === "nfts" && <NftActivity schools={schools} yearStart={yearTab.start} yearEnd={yearTab.end} />}
    </>
  );
}
