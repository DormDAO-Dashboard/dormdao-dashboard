"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SchoolRow } from "@/lib/types";
import { formatNav, formatUSD, formatPct, slugify } from "@/lib/utils";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type SortKey = "rank" | "nav" | "usdReturn" | "ethReturn";

function cardClasses(rank: number, isYours: boolean): string {
  const border = isYours
    ? "border-primary/50"
    : rank === 1
    ? "border-yellow-400/40 dark:border-yellow-400/20"
    : rank === 2
    ? "border-gray-400/40 dark:border-gray-400/20"
    : rank === 3
    ? "border-amber-600/40 dark:border-amber-600/20"
    : "border-gray-200 dark:border-gray-800";

  const bg =
    rank === 1
      ? "bg-yellow-400/20 dark:bg-yellow-400/15"
      : rank === 2
      ? "bg-gray-300/30 dark:bg-gray-400/15"
      : rank === 3
      ? "bg-amber-600/20 dark:bg-amber-600/15"
      : "bg-white dark:bg-gray-900/30";

  return cn("relative rounded-lg border p-4 hover:border-primary/40 transition-all cursor-pointer h-full", border, bg);
}

function SchoolCard({ s, isYours }: { s: SchoolRow; isYours?: boolean }) {
  return (
    <Link href={`/schools/${s.slug}`}>
      <div className={cardClasses(s.rank, !!isYours)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <SchoolLogo name={s.name} size={32} />
            <div>
              <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mb-0.5">#{s.rank}</div>
              <h2 className="text-gray-900 dark:text-white font-semibold">{schoolDisplayName(s.name)}</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">ETH ROI</span>
            <span className={`text-sm font-mono font-bold ${s.ethReturn >= 0 ? "text-primary" : "text-danger"}`}>
              {formatPct(s.ethReturn)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-gray-500">NAV</div>
            <div className="font-mono text-gray-700 dark:text-gray-200">{formatNav(s.nav)}</div>
          </div>
          <div>
            <div className="text-gray-500">USD Return</div>
            <div className={`font-mono ${s.usdReturn >= 0 ? "text-primary" : "text-danger"}`}>
              {formatPct(s.usdReturn)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Avg Entry FDV</div>
            <div className="font-mono text-gray-400">{formatUSD(s.avgEntryFdv, true)}</div>
          </div>
          <div>
            <div className="text-gray-500">Deployed</div>
            <div className="font-mono text-gray-400">{formatPct(s.pctDeployed)}</div>
          </div>
        </div>
        {isYours && (
          <span className="absolute bottom-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30 leading-none">
            Your School
          </span>
        )}
      </div>
    </Link>
  );
}

export function SchoolsClient({ initialSchools }: { initialSchools: SchoolRow[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rank");
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

  const sortedAll = [...initialSchools].sort((a, b) => {
    if (sortBy === "rank") return a.rank - b.rank;
    if (sortBy === "nav") return b.nav - a.nav;
    if (sortBy === "usdReturn") return b.usdReturn - a.usdReturn;
    if (sortBy === "ethReturn") return b.ethReturn - a.ethReturn;
    return 0;
  });

  const filtered = sortedAll.filter((s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      schoolDisplayName(s.name).toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search schools…"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
        >
          <option value="rank">Sort: Rank</option>
          <option value="nav">Sort: NAV</option>
          <option value="usdReturn">Sort: USD Return</option>
          <option value="ethReturn">Sort: ETH Return</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((s) => (
          <SchoolCard key={s.slug} s={s} isYours={userSlug === s.slug} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No schools match &quot;{query}&quot;
        </div>
      )}
    </>
  );
}
