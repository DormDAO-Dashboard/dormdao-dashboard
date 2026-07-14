import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatNav, formatPct } from "@/lib/utils";
import { getSchoolsData } from "@/lib/cache";
import { KpiCard, Skeleton } from "@/components/ui/Card";
import { SchoolTabs } from "@/components/SchoolTabs";
import { SyncFooter } from "@/components/SyncFooter";
import { SchoolLogo } from "@/components/SchoolLogo";
import { SCHOOL_SOCIALS, schoolDisplayName } from "@/lib/schoolData";
import { ArrowLeft, Globe, X, Link2, Camera, MessageSquare, Send, Code2 } from "lucide-react";

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

  const otherSchools: Record<string, string[]> = {};
  for (const h of school.holdings ?? []) {
    const others = schools
      .filter((s) => s.slug !== slug && s.holdings?.some((oh) => oh.ticker === h.ticker))
      .map((s) => schoolDisplayName(s.name));
    if (others.length > 0) otherSchools[h.ticker] = others;
  }

  return (
    <>
      <Link href="/schools" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Schools
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <SchoolLogo name={school.name} size={48} />
        <div>
          <div className="text-xs font-mono text-gray-500 mb-1">Rank #{school.rank}</div>
          <h1 className="text-2xl font-semibold text-white">{schoolDisplayName(school.name)}</h1>
        </div>
      </div>

      <SocialLinks name={school.name} />

      {/* KPI cards — always visible above tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="NAV" value={formatNav(school.nav)} />
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

      {/* Tabbed content */}
      <SchoolTabs school={school} otherSchools={otherSchools} />

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
              <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
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
