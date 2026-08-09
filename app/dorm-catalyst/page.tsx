import { ArrowRight } from "lucide-react";
import { ShowcasePageShell } from "@/components/showcase/ShowcasePageShell";
import { ShowcaseHero } from "@/components/showcase/ShowcaseHero";
import { ShowcaseSection } from "@/components/showcase/ShowcaseSection";
import { PlaceholderNote } from "@/components/showcase/PlaceholderNote";
import { SHOWCASE_COLORS } from "@/lib/showcaseColors";
import {
  DORM_CATALYST_TAGLINE,
  DORM_CATALYST_INTRO,
  DORM_CATALYST_SECTIONS,
  DORM_CATALYST_CTA_LABEL,
  DORM_CATALYST_CTA_URL,
} from "@/lib/dormCatalystData";

export const metadata = { title: "Dorm Catalyst — DormDAO" };

export default function DormCatalystPage() {
  const accent = SHOWCASE_COLORS.dormCatalyst;

  return (
    <ShowcasePageShell>
      <ShowcaseHero
        eyebrow="Dorm Catalyst"
        title="Dorm Catalyst"
        tagline={DORM_CATALYST_TAGLINE}
        description={DORM_CATALYST_INTRO}
        accentColor={accent}
      />

      <PlaceholderNote className="max-w-2xl mx-auto mb-12">
        This page is a lightweight shell — Dorm Catalyst wasn&apos;t defined in detail yet, so the sections below are ready-to-fill
        slots rather than fabricated specifics.
      </PlaceholderNote>

      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        {DORM_CATALYST_SECTIONS.map((s) => (
          <div key={s.id} id={s.id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{s.title}</h2>
            <p className="text-sm text-gray-700 dark:text-gray-400 leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>

      <ShowcaseSection title="Get Involved" accentColor={accent} className="mb-4">
        <div className="rounded-lg border p-8 text-center" style={{ borderColor: `${accent}33`, backgroundColor: `${accent}0D` }}>
          <p className="text-gray-700 dark:text-gray-300 mb-5">CTA slot — link out to an application, waitlist, or program page once available.</p>
          {DORM_CATALYST_CTA_URL ? (
            <a
              href={DORM_CATALYST_CTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: `${accent}26`, border: `1px solid ${accent}66`, color: accent }}
            >
              {DORM_CATALYST_CTA_LABEL} <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium opacity-50 cursor-not-allowed"
              style={{ backgroundColor: `${accent}26`, border: `1px solid ${accent}66`, color: accent }}
            >
              {DORM_CATALYST_CTA_LABEL} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </ShowcaseSection>
    </ShowcasePageShell>
  );
}
