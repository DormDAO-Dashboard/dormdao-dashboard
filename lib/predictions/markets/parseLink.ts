// Parse a pasted market link (or raw Kalshi ticker) into something the
// lookup route can query. Synthesis links aren't supported: Synthesis sits on
// top of Polymarket/Kalshi, so paste the underlying market's link instead.

export type MarketLink =
  | { source: "polymarket"; eventSlug: string | null; marketSlug: string | null }
  | { source: "kalshi"; ticker: string };

const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
// SERIES-EVENT or SERIES-EVENT-STRIKE, e.g. KXGDP-26OCT30-T3.5
const KALSHI_TICKER = /^[A-Z0-9]+-[A-Z0-9]+(?:-[A-Z0-9.]+)?$/;

function toUrl(raw: string): URL | null {
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

export function parseMarketLink(input: string): MarketLink | null {
  const raw = input.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (!raw.includes("/") && KALSHI_TICKER.test(upper)) return { source: "kalshi", ticker: upper };

  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "polymarket.com") {
    if (parts[0] === "event" && parts[1] && SLUG.test(parts[1])) {
      const marketSlug = parts[2] && SLUG.test(parts[2]) ? parts[2] : null;
      return { source: "polymarket", eventSlug: parts[1], marketSlug };
    }
    if (parts[0] === "market" && parts[1] && SLUG.test(parts[1])) {
      return { source: "polymarket", eventSlug: null, marketSlug: parts[1] };
    }
    return null;
  }

  if (host === "kalshi.com" && parts[0] === "markets") {
    // /markets/{series}/{title-slug}/{event-ticker}; the last segment is the
    // most specific ticker present.
    const last = parts[parts.length - 1]?.toUpperCase();
    return last && KALSHI_TICKER.test(last) ? { source: "kalshi", ticker: last } : null;
  }

  return null;
}
