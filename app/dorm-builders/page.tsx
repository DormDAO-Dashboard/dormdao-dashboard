import { Rocket, MessageSquare, FileText, Link2 } from "lucide-react";
import { ShowcaseHero } from "@/components/showcase/ShowcaseHero";
import { ShowcaseSection } from "@/components/showcase/ShowcaseSection";
import { PlaceholderNote } from "@/components/showcase/PlaceholderNote";
import { CollateralLinkCard } from "@/components/showcase/CollateralLinkCard";
import { VideoCard } from "@/components/showcase/VideoCard";
import { SHOWCASE_COLORS } from "@/lib/showcaseColors";
import {
  DORM_BUILDERS_TAGLINE,
  DORM_BUILDERS_INTRO,
  DORM_BUILDERS_PROGRAM_YEAR,
  DORM_BUILDERS_PROGRAM_SUMMARY_PLACEHOLDER,
  DORM_BUILDERS_HIGHLIGHTS,
  DORM_BUILDERS_VIDEOS,
  DORM_BUILDERS_COLLATERAL,
} from "@/lib/dormBuildersData";

const COLLATERAL_ICONS = [MessageSquare, FileText, Link2];

export const metadata = { title: "Dorm Builders — DormDAO" };

export default function DormBuildersPage() {
  const accent = SHOWCASE_COLORS.dormBuilders;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top ~1/8: what Dorm Builders is */}
      <ShowcaseHero
        eyebrow="Dorm Builders"
        title="Dorm Builders"
        tagline={DORM_BUILDERS_TAGLINE}
        description={DORM_BUILDERS_INTRO}
        accentColor={accent}
      />
      <PlaceholderNote className="max-w-2xl mx-auto mb-16">
        Full description in Zack&apos;s voice, pending his tweets / program collateral / data room as source material.
      </PlaceholderNote>

      {/* Remaining ~7/8: 2024 program spotlight */}
      <ShowcaseSection
        title={`${DORM_BUILDERS_PROGRAM_YEAR} Dorm Builders Program`}
        accentColor={accent}
      >
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-4 h-4" style={{ color: accent }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
              Program Recap
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            {DORM_BUILDERS_PROGRAM_SUMMARY_PLACEHOLDER}
          </p>
          <PlaceholderNote>
            This summary is a placeholder — swap in the real {DORM_BUILDERS_PROGRAM_YEAR} recap once source material is available.
          </PlaceholderNote>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Cohort Highlights" accentColor={accent} subtitle="Standout moments from the 2024 program">
        <div className="grid sm:grid-cols-3 gap-4">
          {DORM_BUILDERS_HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">{h.title}</h3>
              <p className="text-xs text-gray-700 dark:text-gray-400 leading-relaxed">{h.description}</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Video" accentColor={accent} subtitle="Program recap and builder spotlights">
        <div className="grid sm:grid-cols-3 gap-4">
          {DORM_BUILDERS_VIDEOS.map((v) => (
            <VideoCard key={v.title} title={v.title} description={v.description} url={v.url} accentColor={accent} />
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Collateral" accentColor={accent} subtitle="Threads and materials from the program">
        <div className="grid sm:grid-cols-3 gap-4">
          {DORM_BUILDERS_COLLATERAL.map((c, i) => (
            <CollateralLinkCard
              key={c.title}
              title={c.title}
              description={c.description}
              url={c.url}
              icon={COLLATERAL_ICONS[i % COLLATERAL_ICONS.length]}
              accentColor={accent}
            />
          ))}
        </div>
      </ShowcaseSection>
    </div>
  );
}
