import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 0.36 → "36¢"
export function cents(price: number | null): string {
  if (price === null) return "—";
  return `${Math.round(price * 100)}¢`;
}

// 0.36 → "36%"
export function prob(price: number | null): string {
  if (price === null) return "—";
  const pct = price * 100;
  return `${pct < 10 && pct > 0 ? pct.toFixed(1) : Math.round(pct)}%`;
}

// 44.4 → "+44%"
export function signedPct(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)}%`;
}

export function usd(value: number, signed = false): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Math.abs(value));
  if (!signed) return value < 0 ? `-${formatted}` : formatted;
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatted}`;
}

// "2026-10-27" → "Oct 27" (date-only strings are calendar dates, not UTC instants)
export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function toneClass(value: number | null): string {
  if (value === null || value === 0) return "text-gray-500 dark:text-gray-400";
  return value > 0 ? "text-primary" : "text-danger";
}
