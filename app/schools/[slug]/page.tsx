import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatUSD, formatPct } from "@/lib/utils";
import { getSchoolsData } from "@/lib/cache";
import { KpiCard, Skeleton } from "@/components/ui/Card";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { SchoolNoteList } from "@/components/SchoolNoteList";
import { HoldingsTableClient } from "@/components/HoldingsTableClient";
import { PortfolioDonut } from "@/components/charts/PortfolioDonut";
import { PortfolioInsightsClient } from "@/components/PortfolioInsightsClient";
import { SyncFooter } from "@/components/SyncFooter";
import { SchoolLogo } from "@/components/SchoolLogo";
import { SCHOOL_SOCIALS } from "@/lib/schoolData";
import { ArrowLeft, Globe, X, Link2, Camera, MessageSquare, Send, Code2 } from "lucide-react";
import { SchoolHistory } from "@/components/SchoolHistory";

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

function SocialLinks({ name }: { name: string }) {
  const socials = SCHOOL_SOCIALS[name];
  if (!socials) return null;

  const links: { href: string; icon: React.ReactNode; label: string }[] = [];

  if (socials.website)   links.push({ href: socials.website,   icon: <Globe className="w-3.5 h-3.5" />,         label: "Website" });
  if (socials.twitter)   links.push({ href: socials.twitter,   icon: <X className="w-3.5 h-3.5" />,             label: "Twitter" });
  if (socials.linkedin)  links.push({ href: socials.linkedin,  icon: <Link2 className="w-3.5 h-3.5" />,         label: "LinkedIn" });
  if (socials.instagram) links.push({ href: socials.instagram, icon: <Camera className="w-3.5 h-3.5" />,        label: "Instagram" });
  if (socials.discord)   links.push({ href: socials.discord,   icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Discord" });
  if (socials.telegram)  links.push({ href: socials.telegram,  icon: <Send className="w-3.5 h-3.5" />,          label: "Telegram" });
  if (socials.github)    links.push({ href: socials.github,    icon: <Code2 className="w-3.5 h-3.5" />,         label: "GitHub" });

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {links.map(({ href, icon, label }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 border border-gray-700/60 hover:border-gray-500 hover:text-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {icon}
          {label}
        </a>
      ))}
    </div>
  );
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

  return (
    <>
      <Link href="/schools" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Schools
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <SchoolLogo name={school.name} size={48} />
        <div>
          <div className="text-xs font-mono text-gray-500 mb-1">Rank #{school.rank}</div>
          <h1 className="text-3xl font-bold text-white">{school.name}</h1>
        </div>
      </div>

      <SocialLinks name={school.name} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="NAV" value={formatUSD(school.nav)} />
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
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio Concentration</h2>
            <PortfolioDonut holdings={school.holdings ?? []} nav={school.nav} />
          </div>
          <PortfolioInsightsClient holdings={school.holdings ?? []} rank={school.rank} />
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
        <div className="mt-4">
          <SchoolNoteList initialNotes={notes} schoolName={school.name} />
        </div>
      </div>

      {/* Portfolio History */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio History</h2>
        <SchoolHistory schoolName={school.name} />
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
