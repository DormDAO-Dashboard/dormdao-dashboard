import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  const abs = Math.abs(value);
  let minFrac = 0, maxFrac = 0;
  if (abs < 0.01) { minFrac = 4; maxFrac = 4; }
  else if (abs < 1) { minFrac = 2; maxFrac = 2; }
  else if (abs < 10) { minFrac = 0; maxFrac = 2; }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatETH(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(4)} ETH`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
