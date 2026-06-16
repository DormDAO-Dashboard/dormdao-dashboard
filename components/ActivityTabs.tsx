"use client";
import { useState, useEffect } from "react";
import { ActivityClient } from "@/components/ActivityClient";
import { SchoolRowWithHoldings } from "@/lib/cache";
import { SchoolLogo } from "@/components/SchoolLogo";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
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
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-300">All Exited &amp; Trimmed Positions</h2>
          <span className="text-xs text-gray-600">{rows.length} total</span>
        </div>
        {schoolsInYear.length > 0 && (
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Schools</option>
            {schoolsInYear.map((name) => (
              <option key={name} value={name}>{name}</option>
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
                        <span className="text-gray-300 text-xs">{h.schoolName}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/tokens/${h.ticker.toLowerCase()}`}
                        className="font-mono font-semibold text-white hover:text-primary transition-colors"
                      >
                        ${h.ticker}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {h.exitType === "exit" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger/20 text-danger border border-danger/30">Exit</span>
                      ) : h.exitType === "trim" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">Trim</span>
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
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Schools</option>
            {allSchools.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}

      {entryRows.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
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
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/schools/${h.schoolSlug}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                        <SchoolLogo name={h.schoolName} size={20} />
                        <span className="text-gray-300 text-xs">{h.schoolName}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold text-white">{h.ticker}</td>
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
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
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
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/schools/${h.schoolSlug}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                          <SchoolLogo name={h.schoolName} size={20} />
                          <span className="text-gray-300 text-xs">{h.schoolName}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono font-semibold text-white">{h.ticker}</td>
                      <td className="px-5 py-3">
                        {h.exitType === "exit" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger/20 text-danger border border-danger/30">Exit</span>
                        ) : h.exitType === "trim" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">Trim</span>
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

export function ActivityTabs({ schools }: { schools: SchoolRowWithHoldings[] }) {
  const [tab, setTab] = useState<Tab>("buys");
  const [year, setYear] = useState<YearKey>("2526");

  const yearTab = YEAR_TABS.find((y) => y.key === year)!;

  return (
    <>
      {/* Year tabs */}
      <div className="flex gap-1.5 mb-4">
        {YEAR_TABS.map((y) => (
          <button
            key={y.key}
            onClick={() => setYear(y.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              year === y.key
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-transparent border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            )}
          >
            {y.label}
          </button>
        ))}
      </div>

      {/* Action tabs */}
      <div className="flex gap-1.5 mb-6 border-b border-gray-800 pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-primary text-white font-medium"
                : "border-transparent text-gray-500 hover:text-gray-300 font-normal"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "buys" && <ActivityClient schools={schools} yearStart={yearTab.start} yearEnd={yearTab.end} />}
      {tab === "sells" && <AllExits schools={schools} yearStart={yearTab.start} yearEnd={yearTab.end} />}
      {tab === "nfts" && <NftActivity schools={schools} yearStart={yearTab.start} yearEnd={yearTab.end} />}
    </>
  );
}
