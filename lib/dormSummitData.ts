import { ShowcaseLink, ShowcaseVideo } from "@/lib/dormBuildersData";

export interface DormSummitYear {
  id: string;
  // Deliberately generic ("Year 1"..."Year 4") rather than a guessed
  // calendar year — swap in the real year once confirmed.
  yearLabel: string;
  headline: string;
  summary: string;
  collateral: ShowcaseLink[];
  videos: ShowcaseVideo[];
}

// "Annual Summit" is the existing sublabel already shipped on the /map zone
// for Dorm Summit — reused here rather than inventing a new tagline.
export const DORM_SUMMIT_TAGLINE = "Annual Summit";

export const DORM_SUMMIT_INTRO =
  "The DormDAO annual summit and events — bringing member schools together to showcase a year of building and investing.";

export const DORM_SUMMIT_YEARS: DormSummitYear[] = [1, 2, 3, 4].map((n) => ({
  id: `year-${n}`,
  yearLabel: `Year ${n}`,
  headline: `Year ${n} headline / theme`,
  summary: `Recap of Dorm Summit Year ${n}: date, location, attendance, featured speakers, and the moments that defined it.`,
  collateral: [
    { title: "Recap Thread", description: "The recap thread for this year's summit.", url: null },
    { title: "Photo Collateral", description: "Photos from the event.", url: null },
  ],
  videos: [
    { title: `Year ${n} Highlights`, description: "Highlight reel from this year's summit.", url: null },
  ],
}));
