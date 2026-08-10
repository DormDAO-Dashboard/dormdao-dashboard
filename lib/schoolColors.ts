export interface SchoolColors {
  primary: string;
  secondary: string;
  text: string;
}

export const SCHOOL_COLORS: Record<string, SchoolColors> = {
  "oregon":         { primary: "#154733", secondary: "#FEE123", text: "#ffffff" },
  "penn":           { primary: "#011F5B", secondary: "#990000", text: "#ffffff" },
  "dartmouth":      { primary: "#00693E", secondary: "#FFFFFF", text: "#ffffff" },
  "texas":          { primary: "#BF5700", secondary: "#FFFFFF", text: "#ffffff" },
  "michigan":       { primary: "#00274C", secondary: "#FFCB05", text: "#ffffff" },
  "nyu":            { primary: "#57068C", secondary: "#FFFFFF", text: "#ffffff" },
  "cornell":        { primary: "#B31B1B", secondary: "#FFFFFF", text: "#ffffff" },
  "columbia":       { primary: "#003087", secondary: "#69B3E7", text: "#ffffff" },
  "waterloo":       { primary: "#FFC72C", secondary: "#000000", text: "#000000" },
  "berkeley":       { primary: "#003262", secondary: "#FDB515", text: "#ffffff" },
  "purdue":         { primary: "#CEB888", secondary: "#000000", text: "#000000" },
  "vanderbilt":     { primary: "#866D4B", secondary: "#000000", text: "#ffffff" },
  "boston-college": { primary: "#8B1A1A", secondary: "#D4AF37", text: "#ffffff" },
  "cambridge":      { primary: "#A3C1D6", secondary: "#000000", text: "#000000" },
  "usc":            { primary: "#990000", secondary: "#FFC72C", text: "#ffffff" },
  "villanova":      { primary: "#003E7E", secondary: "#009DE3", text: "#ffffff" },
  "st-andrews":     { primary: "#003E7E", secondary: "#FFFFFF", text: "#ffffff" },
  "uva":            { primary: "#232D4B", secondary: "#E57200", text: "#ffffff" },
  "imperial":       { primary: "#003E74", secondary: "#FFFFFF", text: "#ffffff" },
} as const;

export const DEFAULT_COLORS: SchoolColors = {
  primary: "#1D9E75",
  secondary: "#FFFFFF",
  text: "#ffffff",
};

export function getSchoolColors(slug: string): SchoolColors {
  return SCHOOL_COLORS[slug] ?? DEFAULT_COLORS;
}

// Most school primary colors are dark (navy, forest green, maroon), so a
// simple alpha-blended border in that color disappears against the app's
// near-black dark-mode background. Blending toward neutral gray instead
// gives a muted tint with roughly consistent, moderate contrast against
// both the light and dark page backgrounds.
export function accentBorderColor(hex: string): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const gray = 140;
  const mix = (c: number) => Math.round(c * 0.55 + gray * 0.45);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
