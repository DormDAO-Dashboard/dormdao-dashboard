"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { createClient } from "@/lib/supabase/client";
import { cn, slugify } from "@/lib/utils";
import { signedPct, toneClass, usd } from "@/lib/predictions/format";
import { predictionSchoolPath } from "@/lib/predictions/schools";

import type { PredictionSchoolRecord } from "@/lib/predictions/schoolRecords";

export type PredictionSchoolCardData = PredictionSchoolRecord;

// Same card shape as the main Schools page (components/SchoolsClient.tsx),
// with prediction-market stats in place of portfolio ones.
function SchoolCard({ s, isYours }: { s: PredictionSchoolCardData; isYours: boolean }) {
  return (
    <Link href={predictionSchoolPath(s.slug)}>
      <div className={cn(
        "relative rounded-lg border p-4 hover:border-primary/40 transition-all cursor-pointer h-full bg-white dark:bg-gray-900/30",
        isYours ? "border-primary/50" : "border-gray-200 dark:border-gray-800",
      )}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <SchoolLogo name={s.name} size={32} />
            <h2 className="text-gray-900 dark:text-white font-semibold">{schoolDisplayName(s.name)}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-700 dark:text-gray-400 font-medium">Avg Return</span>
            <span className={cn("text-sm font-mono font-bold", toneClass(s.avgReturn))}>{signedPct(s.avgReturn)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-gray-700 dark:text-gray-400">Pitches</div>
            <div className="font-mono text-gray-700 dark:text-gray-200">{s.pitches}</div>
          </div>
          <div>
            <div className="text-gray-700 dark:text-gray-400">Fund P&amp;L</div>
            <div className={cn("font-mono", toneClass(s.pnlUsd))}>{usd(s.pnlUsd, true)}</div>
          </div>
          <div>
            <div className="text-gray-700 dark:text-gray-400">Hit Rate</div>
            <div className="font-mono text-gray-700 dark:text-gray-400">
              {s.hitRate === null ? "—" : `${Math.round(s.hitRate)}% (${s.wins}/${s.closed})`}
            </div>
          </div>
          <div>
            <div className="text-gray-700 dark:text-gray-400">Selected</div>
            <div className="font-mono text-gray-700 dark:text-gray-400">{s.selected}</div>
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

export function PredictionSchoolsClient({ schools }: { schools: PredictionSchoolCardData[] }) {
  const [query, setQuery] = useState("");
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

  const q = query.toLowerCase();
  const filtered = schools.filter((s) =>
    !q || s.name.toLowerCase().includes(q) || schoolDisplayName(s.name).toLowerCase().includes(q));

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 dark:text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search schools…"
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((s) => <SchoolCard key={s.slug} s={s} isYours={userSlug === s.slug} />)}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-700 dark:text-gray-400">
          No schools match &quot;{query}&quot;
        </div>
      )}
    </>
  );
}
