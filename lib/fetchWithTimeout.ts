// A `fetch` wrapper that aborts (and therefore rejects, instead of hanging
// forever) after `timeoutMs`. Used both for our own outbound calls to
// third-party APIs (Google Sheets, CoinGecko, Hyperliquid) and — via
// lib/supabase/server.ts's `global.fetch` option — for every Supabase auth
// and database request the app makes. Without this, a single slow/stalled
// upstream response blocks whatever page or route awaited it indefinitely,
// which is exactly the "sometimes instant, sometimes infinite" symptom: it
// only shows up when that particular request happens to stall.
//
// Deliberately avoids AbortSignal.any() (composing two AbortSignals) — this
// runs inside Supabase's client across the browser, Node, and Vercel's Edge
// middleware runtime, and any one of those lacking that (newer) API would
// make every single call fail immediately instead of only a stalled one,
// turning an intermittent bug into a permanent one. Manual listener
// composition below only needs AbortController, which all three support.
export function withFetchTimeout(timeoutMs: number, baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const externalSignal = init?.signal;
    let onExternalAbort: (() => void) | undefined;
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        onExternalAbort = () => controller.abort();
        externalSignal.addEventListener("abort", onExternalAbort);
      }
    }

    try {
      return await baseFetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      if (externalSignal && onExternalAbort) externalSignal.removeEventListener("abort", onExternalAbort);
    }
  };
}
