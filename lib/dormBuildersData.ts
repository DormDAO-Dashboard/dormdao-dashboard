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

export interface DormBuildersTeam {
  school: string;
  members: string;
  description: string;
}

// "Web3 Development" is the existing sublabel already shipped on the /map
// zone for Dorm Builders — reused here rather than inventing a new tagline.
export const DORM_BUILDERS_TAGLINE = "Web3 Development";

// Sourced from Zack Rosenblatt's Season 01 announcement thread:
// https://x.com/zackrosenblatt_/status/1881404089478861310
export const DORM_BUILDERS_INTRO =
  "Dorm Builders is a student hackathon operated by Collab+Currency x DormDAO, giving students at the world's top universities the chance to build real crypto x AI products — with a $10,000 grant per team.";

// Season 01 ran January–April 2025 (announced 2025/01/20, teams selected
// 2025/02/10, demo day 2025/04/25-27) per the source tweets — not 2024 as
// originally briefed.
export const DORM_BUILDERS_PROGRAM_LABEL = "Season 01";

// Recap assembled from the three source tweets (rules announcement, team
// selections, and demo day) — see DORM_BUILDERS_COLLATERAL for the originals.
export const DORM_BUILDERS_PROGRAM_SUMMARY =
  "For Season 01, Dorm Builders partnered with the OpenTensor Foundation, tasking eight student teams with building new projects on Bittensor, the crypto x AI network. Each team received a $10,000 grant, with additional cash awards for the best projects at demo day. After 15 weeks of building, all eight teams presented their projects on stage at Endgame Summit, a Bittensor summit in Austin, TX (April 25–27, 2025) — sponsored by Collab+Currency, the OpenTensor Foundation, Yuma, Datura, Mog Machine, and OSS Capital.";

export const DORM_BUILDERS_TEAMS: DormBuildersTeam[] = [
  {
    school: "Penn Blockchain",
    members: "Juno & Guru",
    description: "A Chrome extension, extendable to any real-estate listings site, that compares listing prices to SN48 (NextPlace AI) predictions and generates a \"value score\" to help buyers make informed decisions.",
  },
  {
    school: "Penn Blockchain",
    members: "Maggie, Hannah, Ani & Lucky",
    description: "An autonomous coding agent served on OpenRouter, powered by SN4 (Manifold Labs) compute — offering inference at significantly reduced cost versus competitors.",
  },
  {
    school: "Cal Blockchain",
    members: "Tanay, Sanjay, Souradeep & Jameson",
    description: "A marketplace for gaming assets generated from SN46 (GoNeuralAI), tokenized on the Bittensor EVM — letting each game or environment create an isolated marketplace for its assets, mirroring traditional game economies.",
  },
  {
    school: "Cal Blockchain",
    members: "Ezra, Ethan, Romain & Jeff",
    description: "Infrastructure UI to aggregate subnet intelligence in a more efficient, consumer-friendly manner, built on top of an unreleased product from SN34 (BitMind AI).",
  },
  {
    school: "Texas Blockchain",
    members: "Arjun, Sulayman, Parth & Viren",
    description: "The first Bittensor PFP collection, curating 3D outputs from SN17 (404GEN) on the Bittensor EVM — appealing to the ethos and roots of the Bittensor community.",
  },
  {
    school: "Boiler Blockchain",
    members: "Anu, Manasvi & Sid",
    description: "Tooling and interfaces for humanizing AI-generated text, working with SN11 (Dippy AI) outputs to curate writing styles matched to demographics and use cases like email and text.",
  },
  {
    school: "Michigan Blockchain",
    members: "Tyler, Aksheet, Om & Kerem",
    description: "A trading agent for global markets leveraging SN6 (Playinfgames) prediction/forecast outputs — building sophisticated strategies and market edge through the collective intelligence of miners.",
  },
  {
    school: "NYU Blockchain & Fintech",
    members: "Anish, Shreyaas, Rifa & Aaron",
    description: "A Bittensor Improvement Proposal (BIP) to better align miners and validators with their subnet owners, including a subnet-level mechanism giving miners and validators an opt-out from potentially malicious subnet operators.",
  },
];

// The full presentations video exists locally (Dorm_Builders_Presentations.mp4,
// ~1.1GB) but is too large to commit to this repo or serve from Vercel —
// needs to be hosted externally (e.g. an unlisted YouTube upload) before it
// can be embedded here. url is null until that link is provided.
export const DORM_BUILDERS_VIDEOS: ShowcaseVideo[] = [
  { title: "Season 01 Demo Day Presentations", description: "All eight teams presenting at Endgame Summit in Austin.", url: null },
];

export const DORM_BUILDERS_COLLATERAL: ShowcaseLink[] = [
  {
    title: "Season 01 Announcement",
    description: "Zack's original announcement thread, with the program rules and format.",
    url: "https://x.com/zackrosenblatt_/status/1881404089478861310",
  },
  {
    title: "Meet the 8 Teams",
    description: "The full team lineup and project breakdowns.",
    url: "https://x.com/Dorm_DAO/status/1889078963546267965",
  },
  {
    title: "Demo Day @ Endgame Summit",
    description: "Recap thread from the Season 01 demo day in Austin.",
    url: "https://x.com/Dorm_DAO/status/1914694037053038796",
  },
];
