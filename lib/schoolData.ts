export const SCHOOL_NAMES = [
  "Berkeley", "Boston College", "Cambridge", "Columbia", "Cornell",
  "Dartmouth", "Imperial", "Michigan", "NYU", "Oregon",
  "Penn", "Purdue", "St. Andrews", "Texas", "USC",
  "UVA", "Vanderbilt", "Villanova", "Waterloo",
] as const;

export type SchoolName = (typeof SCHOOL_NAMES)[number];

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
