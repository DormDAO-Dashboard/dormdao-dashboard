import { MessageSquare, ImageIcon } from "lucide-react";
import { ShowcasePageShell } from "@/components/showcase/ShowcasePageShell";
import { ShowcaseHero } from "@/components/showcase/ShowcaseHero";
import { ShowcaseSection } from "@/components/showcase/ShowcaseSection";
import { PlaceholderNote } from "@/components/showcase/PlaceholderNote";
import { CollateralLinkCard } from "@/components/showcase/CollateralLinkCard";
import { VideoCard } from "@/components/showcase/VideoCard";
import { SHOWCASE_COLORS } from "@/lib/showcaseColors";
import { DORM_SUMMIT_TAGLINE, DORM_SUMMIT_INTRO, DORM_SUMMIT_YEARS } from "@/lib/dormSummitData";

const COLLATERAL_ICONS = [MessageSquare, ImageIcon];

export const metadata = { title: "Dorm Summit — DormDAO" };

export default function DormSummitPage() {
  const accent = SHOWCASE_COLORS.dormSummit;

  return (
    <ShowcasePageShell>
      <ShowcaseHero
        eyebrow="Dorm Summit"
        title="Dorm Summit"
        tagline={DORM_SUMMIT_TAGLINE}
        description={DORM_SUMMIT_INTRO}
        accentColor={accent}
      />

      <div className="mb-8">
        <PlaceholderNote className="max-w-2xl mx-auto">
          Year sections below are a shell — swap in real years, headlines, and recaps sourced from Zack&apos;s Twitter, DormDAO&apos;s feed, and prior Summit threads.
        </PlaceholderNote>
      </div>

      {DORM_SUMMIT_YEARS.map((year, i) => (
        <ShowcaseSection
          key={year.id}
          title={year.yearLabel}
          accentColor={accent}
          subtitle={year.headline}
          className={i === DORM_SUMMIT_YEARS.length - 1 ? "mb-6" : undefined}
        >
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-5">{year.summary}</p>

            <div className="grid sm:grid-cols-3 gap-4">
              {year.videos.map((v) => (
                <VideoCard key={v.title} title={v.title} description={v.description} url={v.url} accentColor={accent} />
              ))}
              {year.collateral.map((c, ci) => (
                <CollateralLinkCard
                  key={c.title}
                  title={c.title}
                  description={c.description}
                  url={c.url}
                  icon={COLLATERAL_ICONS[ci % COLLATERAL_ICONS.length]}
                  accentColor={accent}
                />
              ))}
            </div>
          </div>
        </ShowcaseSection>
      ))}
    </ShowcasePageShell>
  );
}
