import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatUSD, formatPct } from "@/lib/utils";
import { fetchSheetsData } from "@/lib/sheets";
import { KpiCard, Skeleton } from "@/components/ui/Card";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { NoteCard } from "@/components/notes/NoteCard";
import { HoldingsTableClient } from "@/components/HoldingsTableClient";
import { ArrowLeft } from "lucide-react";

async function getSchoolAndPeers(slug: string) {
  try {
    const { schools } = await fetchSheetsData();
    const school = schools.find((s) => s.slug === slug) ?? null;
    return { school, allSchools: schools };
  } catch {
    return { school: null, allSchools: [] };
  }
}

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
  const { school, allSchools } = await getSchoolAndPeers(slug);
  if (!school) notFound();

  const notes = await getNotes(school.name);

  const otherSchools: Record<string, string[]> = {};
  for (const h of school.holdings ?? []) {
    const others = allSchools
      .filter((s) => s.slug !== slug && s.holdings?.some((oh) => oh.ticker === h.ticker))
      .map((s) => s.name);
    if (others.length > 0) otherSchools[h.ticker] = others;
  }

  return (
    <>
      <Link href="/schools" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Schools
      </Link>

      <div className="mb-8">
        <div className="text-xs font-mono text-gray-500 mb-1">Rank #{school.rank}</div>
        <h1 className="text-3xl font-bold text-white">{school.name}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">
            Active Holdings ({school.holdings?.length ?? 0})
          </h2>
        </div>
        {school.holdings && school.holdings.length > 0 ? (
          <HoldingsTableClient
            holdings={school.holdings}
            otherSchools={otherSchools}
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
    </>
  );
}

export default function SchoolDetailPage({ params }: { params: { slug: string } }) {
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
      <SchoolContent slug={params.slug} />
    </Suspense>
  );
}
