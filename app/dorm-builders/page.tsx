import { Rocket, MessageSquare, FileText, Link2 } from "lucide-react";
import { ShowcasePageShell } from "@/components/showcase/ShowcasePageShell";
import { ShowcaseHero } from "@/components/showcase/ShowcaseHero";
import { ShowcaseSection } from "@/components/showcase/ShowcaseSection";
import { PlaceholderNote } from "@/components/showcase/PlaceholderNote";
import { CollateralLinkCard } from "@/components/showcase/CollateralLinkCard";
import { VideoCard } from "@/components/showcase/VideoCard";
import { SHOWCASE_COLORS } from "@/lib/showcaseColors";
import {
  DORM_BUILDERS_TAGLINE,
  DORM_BUILDERS_INTRO,
  DORM_BUILDERS_PROGRAM_LABEL,
  DORM_BUILDERS_PROGRAM_SUMMARY,
  DORM_BUILDERS_TEAMS,
  DORM_BUILDERS_VIDEOS,
  DORM_BUILDERS_COLLATERAL,
} from "@/lib/dormBuildersData";

const COLLATERAL_ICONS = [MessageSquare, FileText, Link2];

export const metadata = { title: "Dorm Builders — DormDAO" };

export default function DormBuildersPage() {
  const accent = SHOWCASE_COLORS.dormBuilders;

  return (
    <ShowcasePageShell>
      {/* Top ~1/8: what Dorm Builders is */}
      <ShowcaseHero
        eyebrow="Dorm Builders"
        title="Dorm Builders"
        tagline={DORM_BUILDERS_TAGLINE}
        description={DORM_BUILDERS_INTRO}
        accentColor={accent}
      />

      {/* Remaining ~7/8: Season 01 program spotlight */}
      <ShowcaseSection
        title={`${DORM_BUILDERS_PROGRAM_LABEL} Program`}
        accentColor={accent}
        subtitle="January–April 2025, with OpenTensor Foundation"
      >
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-4 h-4" style={{ color: accent }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
              Program Recap
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {DORM_BUILDERS_PROGRAM_SUMMARY}
          </p>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="The 8 Teams" accentColor={accent} subtitle="Every team and project from Season 01">
        <div className="grid sm:grid-cols-2 gap-4">
          {DORM_BUILDERS_TEAMS.map((t, i) => (
            <div key={`${t.school}-${i}`} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.school}</h3>
                <span className="text-xs shrink-0" style={{ color: accent }}>{t.members}</span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-400 leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Video" accentColor={accent} subtitle="Demo day presentations from Endgame Summit">
        <div className="grid sm:grid-cols-2 gap-4">
          {DORM_BUILDERS_VIDEOS.map((v) => (
            <VideoCard key={v.title} title={v.title} description={v.description} url={v.url} accentColor={accent} />
          ))}
        </div>
        {DORM_BUILDERS_VIDEOS.some((v) => !v.url) && (
          <PlaceholderNote className="mt-4">
            The presentations video is saved locally (~1.1GB) but too large to host directly on this site — upload it to
            YouTube (unlisted) or Vimeo and swap in the link.
          </PlaceholderNote>
        )}
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
    </ShowcasePageShell>
  );
}
