// "Accelerator" and the description below are the existing copy already
// shipped on the /map zone for Dorm Catalyst — reused here rather than
// inventing new positioning. Everything else on this page is an intentionally
// lightweight, easy-to-fill-in shell per the brief (the meeting didn't define
// this page in detail, so no further specifics are fabricated here).
export const DORM_CATALYST_TAGLINE = "Accelerator";

export const DORM_CATALYST_INTRO =
  "Accelerating the next generation of crypto founders.";

export interface DormCatalystSection {
  id: string;
  title: string;
  description: string;
}

export const DORM_CATALYST_SECTIONS: DormCatalystSection[] = [
  { id: "overview", title: "Program Overview", description: "What Dorm Catalyst is, who it's for, and how it works." },
  { id: "partners", title: "Partners", description: "Partner organizations, sponsors, or collaborators." },
  { id: "outputs", title: "Outputs", description: "Cohort outputs, results, or case studies." },
  { id: "collateral", title: "Collateral", description: "Decks, links, press, and other program materials." },
];

export const DORM_CATALYST_CTA_LABEL = "Learn More";
export const DORM_CATALYST_CTA_URL: string | null = null;
