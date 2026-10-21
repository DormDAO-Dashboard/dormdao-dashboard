import { withFetchTimeout } from "@/lib/fetchWithTimeout";

const timedFetch = withFetchTimeout(8_000);
const RETRY_DELAY_MS = 750;

// CoinGecko's free tier intermittently 429s when a page fires several calls
// at once (prices + coin-detail + market-chart on the token page). Retry once
// on a 429/5xx or network error — same policy as lib/prices.ts's fetchBatch —
// so a single unlucky hit doesn't blank out the chart or market stats.
export async function fetchCoinGecko(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await timedFetch(url, init);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 1) return res;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  throw lastError instanceof Error ? lastError : new Error("CoinGecko request failed");
}
