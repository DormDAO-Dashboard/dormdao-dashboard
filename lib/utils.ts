import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(value: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}t`;
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}b`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}m`;
    if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}k`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  const abs = Math.abs(value);
  let minFrac = 0, maxFrac = 2;
  if (abs < 0.01) { minFrac = 4; maxFrac = 4; }
  else if (abs < 1) { minFrac = 2; maxFrac = 2; }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(value);
}

// Dedicated price formatter with fixed decimal places by magnitude
export function formatPrice(value: number): string {
  const abs = Math.abs(value);
  const fractionDigits = abs >= 1000 ? 2 : abs >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPct(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatETH(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(4)} ETH`;
}

export function formatNav(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Buckets a last-sign-in timestamp into the admin members table's relative
// labels: Online -> <1 Hour ago -> hourly up to 24 Hours ago -> daily up to
// 30 Days ago -> monthly up to 12 months ago -> yearly, capped at "over 5
// years ago". "Online" is a proxy (signed in within the last 5 minutes) —
// there's no real presence/session tracking to say a user is active right now.
export function formatLastSignIn(lastSignInAt: string | null | undefined): string {
  if (!lastSignInAt) return "Never";
  const then = new Date(lastSignInAt).getTime();
  if (Number.isNaN(then)) return "Never";

  const diffMs = Math.max(0, Date.now() - then);
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  if (diffMs < 5 * MINUTE) return "Online";
  if (diffMs < HOUR) return "<1 Hour ago";
  if (diffMs < DAY) {
    const hours = Math.min(24, Math.ceil(diffMs / HOUR));
    return `${hours} Hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diffMs < 30 * DAY) {
    const days = Math.min(30, Math.ceil(diffMs / DAY));
    return `${days} Day${days === 1 ? "" : "s"} ago`;
  }
  if (diffMs < YEAR) {
    const months = Math.min(12, Math.ceil(diffMs / MONTH));
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.min(5, Math.floor(diffMs / YEAR));
  return years <= 1 ? "over a year ago" : `over ${years} years ago`;
}
