"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SchoolRow } from "@/lib/types";
import { SchoolLogo } from "@/components/SchoolLogo";
import { formatNav, formatPct, cn, slugify } from "@/lib/utils";
import { getSchoolColors } from "@/lib/schoolColors";
import { schoolDisplayName } from "@/lib/schoolData";
import { createClient } from "@/lib/supabase/client";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// ─── Season config ────────────────────────────────────────────────────────────

type Season = "2025-2026" | "2024-2025" | "2023-2024";

const SEASONS: { key: Season; tab: string; label: string; period: string }[] = [
  { key: "2025-2026", tab: "25–26", label: "Current Season", period: "Oct 2025 – Sep 2026" },
  { key: "2024-2025", tab: "24–25", label: "2024–2025 Season", period: "Oct 2024 – Sep 2025" },
  { key: "2023-2024", tab: "23–24", label: "2023–2024 Season", period: "Oct 2023 – Sep 2024" },
];

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type MainSortKey = "rank" | "nav" | "usdReturn" | "ethReturn" | "pctDeployed";
type SideSortKey = "rank" | "usdReturn" | "ethReturn";
type QtSortKey = "name" | "quarterlyUsd" | "quarterlyEth";

function SortIconNeutral({ col, sortKey, asc, yellow }: { col: string; sortKey: string; asc: boolean; yellow?: boolean }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-400 dark:text-gray-600 inline ml-0.5 shrink-0" />;
  const cls = yellow ? "text-yellow-600 dark:text-yellow-400" : "text-primary";
  return asc
    ? <ChevronUp className={`w-3 h-3 ${cls} inline ml-0.5 shrink-0`} />
    : <ChevronDown className={`w-3 h-3 ${cls} inline ml-0.5 shrink-0`} />;
}

// ─── Shared cell ──────────────────────────────────────────────────────────────

function ReturnCell({ value }: { value: number }) {
  return (
    <span className={cn("font-mono tabular-nums", value >= 0 ? "text-primary" : "text-danger")}>
      {formatPct(value, false)}
    </span>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

function Panel({
  children,
  header,
  highlight,
  className,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-lg",
      highlight
        ? "border border-yellow-500/50 bg-yellow-500/[0.02]"
        : "border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/20",
      className
    )}>
      <div className={cn(
        "shrink-0 px-3 py-2 border-b",
        highlight ? "border-yellow-500/30 bg-yellow-500/[0.04]" : "border-gray-200 dark:border-gray-800"
      )}>
        {header}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ─── "You" badge ─────────────────────────────────────────────────────────────

function YouBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/20 text-primary border border-primary/30 leading-none ml-1 shrink-0">
      You
    </span>
  );
}

// ─── Quarterly table (left panel) ────────────────────────────────────────────

function QuarterlyTable({ schools, userSlug }: { schools: SchoolRow[]; userSlug: string | null }) {
  const [sortKey, setSortKey] = useState<QtSortKey>("quarterlyEth");
  const [asc, setAsc] = useState(false);

  function toggle(key: QtSortKey) {
    if (sortKey === key) setAsc(v => !v);
    else { setSortKey(key); setAsc(key === "name"); }
  }

  const sorted = [...schools].sort((a, b) => {
    const mult = asc ? 1 : -1;
    if (sortKey === "name") return schoolDisplayName(a.name).localeCompare(schoolDisplayName(b.name)) * mult;
    if (sortKey === "quarterlyUsd") return ((a.quarterlyUsdReturn ?? 0) - (b.quarterlyUsdReturn ?? 0)) * mult;
    return ((a.quarterlyEthReturn ?? 0) - (b.quarterlyEthReturn ?? 0)) * mult;
  });

  const th = "px-2 py-1.5 whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-gray-500 text-[10px] uppercase tracking-wide";

  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <tr className="border-b border-gray-200 dark:border-gray-800">
          <th className="px-2 py-1.5 whitespace-nowrap text-left text-[10px] uppercase tracking-wide text-gray-500 w-7">#</th>
          <th className={cn(th, "text-left")} onClick={() => toggle("name")}>
            School <SortIconNeutral col="name" sortKey={sortKey} asc={asc} />
          </th>
          <th className={cn(th, "text-right")} onClick={() => toggle("quarterlyUsd")}>
            USD <SortIconNeutral col="quarterlyUsd" sortKey={sortKey} asc={asc} />
          </th>
          <th className={cn(th, "text-right")} onClick={() => toggle("quarterlyEth")}>
            ETH <SortIconNeutral col="quarterlyEth" sortKey={sortKey} asc={asc} />
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((s, i) => {
          const isYou = userSlug === s.slug;
          const youColor = isYou ? getSchoolColors(s.slug).primary : undefined;
          return (
            <tr key={s.slug}
              className="border-b border-gray-200/80 dark:border-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800/20 transition-colors"
              style={isYou ? { borderLeft: `3px solid ${youColor}` } : {}}
            >
              <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500 font-mono text-[10px] w-7">{i + 1}</td>
              <td className="px-2 py-1.5">
                <Link href={`/schools/${s.slug}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <SchoolLogo name={s.name} size={15} />
                  <span className="text-[11px] text-gray-900 dark:text-white truncate">{schoolDisplayName(s.name)}</span>
                  {isYou && <YouBadge />}
                </Link>
              </td>
              <td className="px-2 py-1.5 text-right">
                {(s.quarterlyUsdReturn ?? 0) !== 0
                  ? <ReturnCell value={s.quarterlyUsdReturn!} />
                  : <span className="text-gray-400 dark:text-gray-600 font-mono">—</span>}
              </td>
              <td className="px-2 py-1.5 text-right">
                {(s.quarterlyEthReturn ?? 0) !== 0
                  ? <ReturnCell value={s.quarterlyEthReturn!} />
                  : <span className="text-gray-400 dark:text-gray-600 font-mono">—</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Season table (middle panel) ─────────────────────────────────────────────

function SeasonTable({ schools, userSlug }: { schools: SchoolRow[]; userSlug: string | null }) {
  const [sortKey, setSortKey] = useState<MainSortKey>("ethReturn");
  const [asc, setAsc] = useState(false);

  function toggle(key: MainSortKey) {
    if (sortKey === key) setAsc(v => !v);
    else { setSortKey(key); setAsc(key === "rank"); }
  }

  const sorted = [...schools].sort((a, b) => {
    const mult = asc ? 1 : -1;
    if (sortKey === "rank") return (a.rank - b.rank) * mult;
    return ((a[sortKey] as number) - (b[sortKey] as number)) * mult;
  });

  const th = (key: MainSortKey, extra = "") => cn(
    "px-2 py-1.5 whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-[10px] uppercase tracking-wide",
    sortKey === key ? "text-yellow-600 dark:text-yellow-400" : "text-gray-500",
    extra
  );

  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <tr className="border-b border-gray-200 dark:border-gray-800">
          <th className={th("rank", "text-left w-7")} onClick={() => toggle("rank")}>
            # <SortIconNeutral col="rank" sortKey={sortKey} asc={asc} yellow />
          </th>
          <th className="px-2 py-1.5 whitespace-nowrap text-left text-[10px] uppercase tracking-wide text-gray-500">School</th>
          <th className={th("nav", "text-right")} onClick={() => toggle("nav")}>
            NAV <SortIconNeutral col="nav" sortKey={sortKey} asc={asc} yellow />
          </th>
          <th className={th("usdReturn", "text-right")} onClick={() => toggle("usdReturn")}>
            Return (USD) <SortIconNeutral col="usdReturn" sortKey={sortKey} asc={asc} yellow />
          </th>
          <th className={th("ethReturn", "text-right")} onClick={() => toggle("ethReturn")}>
            Return (ETH) <SortIconNeutral col="ethReturn" sortKey={sortKey} asc={asc} yellow />
          </th>
          <th className={th("pctDeployed", "text-right")} onClick={() => toggle("pctDeployed")}>
            % Deployed <SortIconNeutral col="pctDeployed" sortKey={sortKey} asc={asc} yellow />
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((s, i) => {
          const displayRank = sortKey === "rank" ? s.rank : i + 1;
          const isYou = userSlug === s.slug;
          const youColor = isYou ? getSchoolColors(s.slug).primary : undefined;
          return (
            <tr key={s.slug}
              className="border-b border-gray-200/80 dark:border-gray-800/40 hover:bg-yellow-500/[0.04] transition-colors"
              style={isYou ? { borderLeft: `3px solid ${youColor}` } : {}}
            >
              <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500 font-mono text-[10px] w-7">{displayRank}</td>
              <td className="px-2 py-1.5">
                <Link href={`/schools/${s.slug}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <SchoolLogo name={s.name} size={15} />
                  <span className="text-[11px] text-gray-900 dark:text-white font-medium">{schoolDisplayName(s.name)}</span>
                  {isYou && <YouBadge />}
                </Link>
              </td>
              <td className="px-2 py-1.5 text-right font-mono text-gray-700 dark:text-gray-300 text-[11px] tabular-nums">{formatNav(s.nav)}</td>
              <td className="px-2 py-1.5 text-right"><ReturnCell value={s.usdReturn} /></td>
              <td className="px-2 py-1.5 text-right"><ReturnCell value={s.ethReturn} /></td>
              <td className="px-2 py-1.5 text-right font-mono text-gray-600 dark:text-gray-400 text-[11px] tabular-nums">
                {s.pctDeployed > 0 ? formatPct(s.pctDeployed, false) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── All-Time table (right panel) ────────────────────────────────────────────

function AllTimeTable({ schools, userSlug }: { schools: SchoolRow[]; userSlug: string | null }) {
  const [sortKey, setSortKey] = useState<SideSortKey>("ethReturn");
  const [asc, setAsc] = useState(false);

  function toggle(key: SideSortKey) {
    if (sortKey === key) setAsc(v => !v);
    else { setSortKey(key); setAsc(key === "rank"); }
  }

  const sorted = [...schools].sort((a, b) => {
    const mult = asc ? 1 : -1;
    if (sortKey === "rank") return (a.rank - b.rank) * mult;
    return ((a[sortKey] as number) - (b[sortKey] as number)) * mult;
  });

  const th = "px-2 py-1.5 whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-gray-500 text-[10px] uppercase tracking-wide";

  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <tr className="border-b border-gray-200 dark:border-gray-800">
          <th className={cn(th, "text-left w-7")} onClick={() => toggle("rank")}>
            # <SortIconNeutral col="rank" sortKey={sortKey} asc={asc} />
          </th>
          <th className="px-2 py-1.5 whitespace-nowrap text-left text-[10px] uppercase tracking-wide text-gray-500">School</th>
          <th className={cn(th, "text-right")} onClick={() => toggle("usdReturn")}>
            USD <SortIconNeutral col="usdReturn" sortKey={sortKey} asc={asc} />
          </th>
          <th className={cn(th, "text-right")} onClick={() => toggle("ethReturn")}>
            ETH <SortIconNeutral col="ethReturn" sortKey={sortKey} asc={asc} />
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((s, i) => {
          const displayRank = sortKey === "rank" ? s.rank : i + 1;
          const isYou = userSlug === s.slug;
          const youColor = isYou ? getSchoolColors(s.slug).primary : undefined;
          return (
            <tr key={s.slug}
              className="border-b border-gray-200/80 dark:border-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800/20 transition-colors"
              style={isYou ? { borderLeft: `3px solid ${youColor}` } : {}}
            >
              <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500 font-mono text-[10px] w-7">{displayRank}</td>
              <td className="px-2 py-1.5">
                <Link href={`/schools/${s.slug}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <SchoolLogo name={s.name} size={15} />
                  <span className="text-[11px] text-gray-900 dark:text-white truncate">{schoolDisplayName(s.name)}</span>
                  {isYou && <YouBadge />}
                </Link>
              </td>
              <td className="px-2 py-1.5 text-right"><ReturnCell value={s.usdReturn} /></td>
              <td className="px-2 py-1.5 text-right"><ReturnCell value={s.ethReturn} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LeaderboardClient({
  schools,
  sinceInceptionSchools,
  schools2425,
  schools2324,
  fetchedAt,
}: {
  schools: SchoolRow[];
  sinceInceptionSchools: SchoolRow[];
  schools2425: SchoolRow[];
  schools2324: SchoolRow[];
  fetchedAt: string;
}) {
  const [season, setSeason] = useState<Season>("2025-2026");
  const [userSlug, setUserSlug] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("profiles").select("school").eq("id", data.user.id).single();
      if (p?.school) setUserSlug(slugify(p.school));
    });
  }, []);

  const activeSchools =
    season === "2025-2026" ? schools
    : season === "2024-2025" ? (schools2425.length > 0 ? schools2425 : [])
    : (schools2324.length > 0 ? schools2324 : []);

  const activeSeason = SEASONS.find(s => s.key === season)!;

  const syncedAgo = Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000);
  const syncLabel = syncedAgo < 1 ? "just now" : `${syncedAgo}m ago`;

  return (
    <div className="flex flex-col h-[calc(100dvh-52px-5rem)]">

      {/* Compact header row */}
      <div className="shrink-0 flex items-center justify-between mb-2">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">Leaderboard</h1>
          <p className="text-[11px] text-gray-500">University DAO performance rankings across all seasons.</p>
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-600 text-right">
          <span>Synced {syncLabel}</span>
          {" · "}
          <button
            onClick={async () => { await fetch("/api/revalidate", { method: "POST" }); window.location.reload(); }}
            className="text-primary hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 min-h-0 flex gap-2.5">

        {/* ── Left: Quarterly ──────────────────────────────── */}
        <Panel
          header={
            <>
              <div className="text-xs font-semibold text-gray-900 dark:text-white">Quarterly</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Current quarter performance</div>
            </>
          }
        >
          <QuarterlyTable schools={schools} userSlug={userSlug} />
        </Panel>

        {/* ── Middle: Current Season ────────────────────────── */}
        <Panel
          highlight
          className="flex-1 min-w-0"
          header={
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">{activeSeason.label}</span>
                <span className="text-[10px] text-yellow-600/80 dark:text-yellow-500/70">{activeSeason.period}</span>
              </div>
              <div className="flex gap-2 mt-0.5">
                {SEASONS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSeason(s.key)}
                    className={cn(
                      "text-[10px] font-medium transition-colors",
                      season === s.key
                        ? "text-yellow-700 dark:text-yellow-300"
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    {s.tab}
                  </button>
                ))}
              </div>
            </>
          }
        >
          {activeSchools.length > 0 ? (
            <SeasonTable schools={activeSchools} userSlug={userSlug} />
          ) : (
            <div className="py-16 text-center text-gray-500 dark:text-gray-600 text-xs">
              Historical data for {activeSeason.label} coming soon.
            </div>
          )}
        </Panel>

        {/* ── Right: All-Time ───────────────────────────────── */}
        <Panel
          header={
            <>
              <div className="text-xs font-semibold text-gray-900 dark:text-white">All-Time</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Since inception</div>
            </>
          }
        >
          {sinceInceptionSchools.length > 0 ? (
            <AllTimeTable schools={sinceInceptionSchools} userSlug={userSlug} />
          ) : (
            <div className="py-16 text-center text-gray-500 dark:text-gray-600 text-xs">No data</div>
          )}
        </Panel>

      </div>
    </div>
  );
}
