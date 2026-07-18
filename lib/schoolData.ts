export const SCHOOL_NAMES = [
  "Berkeley", "Boston College", "Cambridge", "Columbia", "Cornell",
  "Dartmouth", "Imperial", "Michigan", "NYU", "Oregon",
  "Penn", "Purdue", "St. Andrews", "Texas", "USC",
  "UVA", "Vanderbilt", "Villanova", "Waterloo",
] as const;

export type SchoolName = (typeof SCHOOL_NAMES)[number];

// User-facing display names: each school's blockchain club name.
// Keys are the internal school identifiers used for data matching, logos,
// slugs, and lookups — those must NOT change. Only the displayed label changes.
export const SCHOOL_DISPLAY_NAMES: Record<string, string> = {
  "Berkeley":       "Blockchain at Berkeley",
  "Boston College": "BC Blockchain",
  "Cambridge":      "Cambridge Blockchain Society",
  "Columbia":       "Blockchain at Columbia",
  "Cornell":        "Cornell Blockchain",
  "Dartmouth":      "Voxchain",
  "Michigan":       "Blockchain at Michigan",
  "NYU":            "NYU Blockchain & Fintech",
  "Oregon":         "Oregon Blockchain Group",
  "Penn":           "FranklinDAO",
  "Purdue":         "Boiler Blockchain",
  "St. Andrews":    "St. Andrews Blockchain",
  "Texas":          "Texas Blockchain",
  "USC":            "Blockchain at SC",
  "Vanderbilt":     "Vanderbilt Blockchain",
  "Villanova":      "Villanova Blockchain",
  "Waterloo":       "Waterloo Blockchain",
};

// Returns the blockchain-club display name for a school, falling back to the
// original name for any school without a mapped club name (e.g. Imperial, UVA).
export function schoolDisplayName(name: string | null | undefined): string {
  if (!name) return name ?? "";
  return SCHOOL_DISPLAY_NAMES[name] ?? name;
}

// Short names for chart X-axis labels (internal key → abbreviated label).
const SCHOOL_SHORT_NAMES: Record<string, string> = {
  "Vanderbilt": "Vandy",
};

// Returns abbreviated name for chart axes; falls back to the internal key.
export function schoolShortName(key: string): string {
  return SCHOOL_SHORT_NAMES[key] ?? key;
}

// Returns "Since <Month> 1, <Year>" for the current fiscal quarter.
// Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct.
export function getQuarterLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let qMonth: number;
  if (month < 3) qMonth = 0;
  else if (month < 6) qMonth = 3;
  else if (month < 9) qMonth = 6;
  else qMonth = 9;
  const qStart = new Date(year, qMonth, 1);
  const monthName = qStart.toLocaleString("en-US", { month: "short" });
  return `Since ${monthName} 1, ${year}`;
}

export interface SchoolSocials {
  website?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  discord?: string;
  telegram?: string;
  github?: string;
}

export const SCHOOL_DOMAINS: Record<string, string> = {
  "Oregon":             "uoregon.edu",
  "Penn":               "upenn.edu",
  "Dartmouth":          "dartmouth.edu",
  "Texas":              "utexas.edu",
  "Michigan":           "umich.edu",
  "NYU":                "nyu.edu",
  "Cornell":            "cornell.edu",
  "Columbia":           "columbia.edu",
  "Waterloo":           "uwaterloo.ca",
  "Berkeley":           "berkeley.edu",
  "Purdue":             "purdue.edu",
  "Vanderbilt":         "vanderbilt.edu",
  "Boston College":     "bc.edu",
  "Cambridge":          "cam.ac.uk",
  "USC":                "usc.edu",
  "Villanova":          "villanova.edu",
  "St. Andrews":        "st-andrews.ac.uk",
  "UVA":                   "virginia.edu",
  "Imperial":              "imperial.ac.uk",
  "Franklindao (Penn)":    "upenn.edu",
  "Vox (Dartmouth)":       "dartmouth.edu",
  "Illinois":              "illinois.edu",
};

// Scraped from each school's blockchain club website
export const SCHOOL_SOCIALS: Record<string, SchoolSocials> = {
  "Oregon": {
    website:   "https://www.oregonblockchain.org",
    twitter:   "https://twitter.com/oregonblock",
    instagram: "https://www.instagram.com/oregonblockchaingroup/",
    linkedin:  "https://www.linkedin.com/company/oregonblockchain/",
  },
  "Cornell": {
    website: "https://www.cornellblockchain.org",
    twitter: "https://twitter.com/CUBlockchain",
    github:  "https://github.com/CornellBlockchain",
  },
  "Michigan": {
    website:  "https://michiganblockchain.org",
    twitter:  "https://x.com/MichBlockchain",
    linkedin: "https://www.linkedin.com/company/umich-blockchain/",
  },
  "NYU": {
    website:   "https://www.nyubnf.com",
    twitter:   "https://twitter.com/nyubnf",
    instagram: "https://www.instagram.com/nyublockchainfintech/",
    linkedin:  "https://www.linkedin.com/company/bf-nyu/",
  },
  "Dartmouth": {
    website: "https://dartmouthblockchain.com",
    twitter: "https://twitter.com/voxchain",
  },
  "Purdue": {
    website:   "https://www.boilerblockchain.org",
    twitter:   "https://twitter.com/boilerblockchain",
    discord:   "https://discord.gg/hnjtVpb9H5",
    github:    "https://github.com/boilerblockchain",
    instagram: "https://www.instagram.com/boilerblockchain",
    linkedin:  "https://www.linkedin.com/company/boilerblockchain",
  },
  "Vanderbilt": {
    twitter: "https://x.com/vandyblockchain",
  },
  "Columbia": {
    website:   "https://blockchainatcolumbia.org",
    twitter:   "https://twitter.com/BlockchainatCU",
    discord:   "https://discord.com/invite/CmxVPuKeuB",
    telegram:  "https://t.me/joinchat/cjeaV8-GR2AxZjYx",
    instagram: "https://www.instagram.com/blockchaincolumbia/",
  },
  "Boston College": {
    linkedin: "https://www.linkedin.com/company/boston-college-cryptocurrency-club/",
  },
  "Cambridge": {
    website:   "https://cambridgeblockchain.org",
    twitter:   "https://twitter.com/camblockchains",
    discord:   "https://discord.gg/j59JtygStA",
    instagram: "https://www.instagram.com/camblockchains/",
    linkedin:  "https://www.linkedin.com/company/camblockchains",
  },
  "Berkeley": {
    website:   "https://blockchain.berkeley.edu",
    twitter:   "https://twitter.com/CalBlockchain",
    instagram: "https://www.instagram.com/calblockchain/",
    linkedin:  "https://www.linkedin.com/company/blockchain-at-berkeley/",
  },
};
