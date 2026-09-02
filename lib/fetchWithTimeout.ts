// A `fetch` wrapper that aborts (and therefore rejects, instead of hanging
// forever) after `timeoutMs`. Used both for our own outbound calls to
// third-party APIs (Google Sheets, CoinGecko, Hyperliquid) and — via
// lib/supabase/server.ts's `global.fetch` option — for every Supabase auth
// and database request the app makes. Without this, a single slow/stalled
// upstream response blocks whatever page or route awaited it indefinitely,
// which is exactly the "sometimes instant, sometimes infinite" symptom: it
// only shows up when that particular request happens to stall.
export function withFetchTimeout(timeoutMs: number, baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
    try {
      return await baseFetch(input, { ...init, signal });
    } finally {
      clearTimeout(timer);
    }
  };
}
