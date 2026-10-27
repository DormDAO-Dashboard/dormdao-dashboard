const TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 750;

// GET JSON from a public market-data API. Retries once on 429/5xx/network
// errors (both APIs rate-limit bursts), times out instead of hanging, and
// returns null on 404 so callers can treat "unknown market" as no data.
export async function getJson<T>(url: string, revalidateSeconds: number): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { revalidate: revalidateSeconds },
      } as RequestInit);
      if (res.ok) return (await res.json()) as T;
      if (res.status === 404) return null;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 1) throw new Error(`${res.status} from ${new URL(url).host}`);
    } catch (err) {
      if (attempt === 1) throw err;
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  return null;
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface YesQuote {
  yes: number | null;
  resolvedYes: number | null; // 1 = YES won, 0 = NO won
  closesAt: string | null;
}
