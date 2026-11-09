import { slugify } from "@/lib/utils";

// Schools with a prediction-markets page. Oregon only for now; each school
// will get its own page in the long run. The pitches/trades data has no
// school field yet — all of it is Oregon's.
export const PREDICTION_SCHOOLS = ["Oregon"] as const;

export const PREDICTION_SCHOOL_SLUGS: readonly string[] = PREDICTION_SCHOOLS.map((n) => slugify(n));

export function predictionSchoolName(slug: string): string | null {
  return PREDICTION_SCHOOLS.find((n) => slugify(n) === slug) ?? null;
}

// Base path of a school's prediction page (its Latest Pitch tab).
export function predictionSchoolPath(slug = "oregon"): string {
  return `/predictions/schools/${slug}`;
}

export function pitchHref(pitchId: string, slug = "oregon"): string {
  return `${predictionSchoolPath(slug)}/pitches/${pitchId}`;
}
