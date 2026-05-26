import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatUSD, formatPct } from "@/lib/utils";
import { getSchoolsData } from "@/lib/cache";
import { KpiCard, Skeleton } from "@/components/ui/Card";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { NoteCard } from "@/components/notes/NoteCard";
import { HoldingsTableClient } from "@/components/HoldingsTableClient";
import { PortfolioDonut } from "@/components/charts/PortfolioDonut";
import { SyncFooter } from "@/components/SyncFooter";
import { ArrowLeft } from "lucide-react";

async function getNotes(school: string) {
  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("research_notes")
      .select("*")
      .ilike("school", `%${school}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  } catch {
    return [];
  }
}

async function SchoolContent({ slug }: { slug: string }) {
  const { schools, fetchedAt } = await getSchoolsData();
  const school = schools.find((s) => s.slug === slug) ?? null;
  if (!school) notFound();

  const notes = await getNotes(school.name);

  const otherSchools: Record<string, string[]> = {};
  for (const h of school.holdings ?? []) {
    const others = schools
      .filter((s) => s.slug !== slug && s.holdings?.some((oh) => oh.ticker === h.ticker))
      .map((s) => s.name);
    if (others.length > 0) otherSchools[h.ticker] = others;
  }

  // Analytics: largest position, position ages
  const holdingsWithPct = (school.holdings ?? []).filter((h) => h.pctOfPortfolio > 0);
  const largestPosition = holdingsWithPct.sort((a, b) => b.pctOfPortfolio - a.pctOfPortfolio)[0];

  // Position ages
  const today = new Date();
  const positionsWithDate = (school.holdings ?? []).filter((h) => h.investmentDate);
  const avgAgeDays = positionsWithDate.length > 0
    ? positionsWithDate.reduce((s, h) => {
        const d = new Date(h.investmentDate);
        return s + (isNaN(d.getTime()) ? 0 : (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / positionsWithDate.length
    : null;

  return (
    <>
      <Link href="/schools" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Schools
      </Link>

      <div className="mb-8">
        <div className="text-xs font-mono text-gray-500 mb-1">Rank #{school.rank}</div>
        <h1 className="text-3xl font-bold text-white">{school.name}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="NAV" value={formatUSD(school.nav, true)} />
        <KpiCard
          label="USD Return"
          value={formatPct(school.usdReturn)}
          positive={school.usdReturn >= 0}
        />
        <KpiCard
          label="ETH Return"
          value={formatPct(school.ethReturn)}
          positive={school.ethReturn >= 0}
        />
        <KpiCard label="% Deployed" value={formatPct(school.pctDeployed)} />
      </div>

      {/* Portfolio analytics row */}
      {(school.holdings?.length ?? 0) > 0 && (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Donut chart */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio Concentration</h2>
            <PortfolioDonut holdings={school.holdings ?? []} nav={school.nav} />
          </div>

          {/* Stat cards */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio Insights</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Positions</div>
                <div className="text-xl font-mono font-bold text-white">{school.holdings?.length ?? 0}</div>
                <div className="text-xs text-gray-600 mt-0.5">active holdings</div>
              </div>
              {largestPosition && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Largest Position</div>
                  <div className="text-lg font-mono font-bold text-white">${largestPosition.ticker}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{largestPosition.pctOfPortfolio.toFixed(1)}% of portfolio</div>
                </div>
              )}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Avg Position Age</div>
                <div className="text-xl font-mono font-bold text-white">
                  {avgAgeDays !== null ? `${Math.round(avgAgeDays)}d` : "—"}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {avgAgeDays !== null ? `~${(avgAgeDays / 30).toFixed(1)} months` : "no date data"}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Rank</div>
                <div className="text-xl font-mono font-bold text-primary">#{school.rank}</div>
                <div className="text-xs text-gray-600 mt-0.5">by ETH performance</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">
            Active Holdings ({school.holdings?.length ?? 0})
          </h2>
        </div>
        {school.holdings && school.holdings.length > 0 ? (
          <HoldingsTableClient
            holdings={school.holdings}
            otherSchools={otherSchools}
            schoolName={school.name}
          />
        ) : (
          <p className="px-5 py-6 text-sm text-gray-500">No holdings data available for this school.</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Research Notes for {school.name}</h2>
        <AddNoteForm
          defaultSchool={school.name}
          tickers={school.holdings?.map((h) => h.ticker) ?? []}
        />
        <div className="flex flex-col gap-3 mt-4">
          {notes.map((note: Parameters<typeof NoteCard>[0]["note"]) => (
            <NoteCard key={note.id} note={note} />
          ))}
          {notes.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No research notes yet for {school.name}. Be the first to add one!
            </div>
          )}
        </div>
      </div>

      <SyncFooter fetchedAt={fetchedAt} />
    </>
  );
}

export default async function SchoolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div>
          <Skeleton className="h-4 w-20 mb-6" />
          <Skeleton className="h-8 w-56 mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SchoolContent slug={slug} />
    </Suspense>
  );
}
