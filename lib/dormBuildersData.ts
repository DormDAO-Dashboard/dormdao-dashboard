export interface ShowcaseHighlight {
  title: string;
  description: string;
}

export interface ShowcaseVideo {
  title: string;
  description?: string;
  url: string | null;
}

export interface ShowcaseLink {
  title: string;
  description?: string;
  url: string | null;
}

// "Web3 Development" is the existing sublabel already shipped on the /map
// zone for Dorm Builders — reused here rather than inventing a new tagline.
export const DORM_BUILDERS_TAGLINE = "Web3 Development";

export const DORM_BUILDERS_INTRO =
  "Dorm Builders is DormDAO's web3 development arm — where student builders ship real products.";

export const DORM_BUILDERS_PROGRAM_YEAR = "2024";

export const DORM_BUILDERS_PROGRAM_SUMMARY_PLACEHOLDER =
  "Recap of the 2024 Dorm Builders program: cohort size and format, what teams built, standout outcomes, and how it fit into the wider DormDAO ecosystem.";

export const DORM_BUILDERS_HIGHLIGHTS: ShowcaseHighlight[] = [
  { title: "Highlight 1", description: "A standout project or team from the 2024 cohort." },
  { title: "Highlight 2", description: "A key milestone, ship, or demo moment worth spotlighting." },
  { title: "Highlight 3", description: "An outcome, metric, or piece of feedback that captures the program's impact." },
];

export const DORM_BUILDERS_VIDEOS: ShowcaseVideo[] = [
  { title: "2024 Program Recap", description: "Full recap video of the 2024 cohort.", url: null },
  { title: "Builder Spotlight", description: "A closer look at one team's build.", url: null },
  { title: "Demo Day Highlights", description: "Highlights from the program's demo day.", url: null },
];

export const DORM_BUILDERS_COLLATERAL: ShowcaseLink[] = [
  { title: "Announcement Thread", description: "The original program announcement.", url: null },
  { title: "Program Recap Thread", description: "Zack's recap thread from the 2024 cohort.", url: null },
  { title: "Program Page / Applications", description: "Where builders applied or learned more.", url: null },
];
