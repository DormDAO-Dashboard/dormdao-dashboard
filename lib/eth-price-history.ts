// Historical ETH prices never change — cache indefinitely in memory
const priceCache = new Map<string, number>();

// Convert sheet date formats to CoinGecko's DD-MM-YYYY. Sheet dates aren't
// zero-padded (e.g. "2026/5/8"), so month/day must accept 1-2 digits — a
// strict \d{2} here silently dropped every single-digit month/day date.
function toGeckoDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const s = dateStr.replace(/\//g, "-").trim();
  const pad = (n: string) => n.padStart(2, "0");
  // YYYY-M-D → DD-MM-YYYY
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) return `${pad(ymd[3])}-${pad(ymd[2])}-${ymd[1]}`;
  // Already D-M-YYYY / DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) return `${pad(dmy[1])}-${pad(dmy[2])}-${dmy[3]}`;
  return null;
}

export async function getHistoricalEthPrices(dates: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  for (const date of dates) {
    const geckoDate = toGeckoDate(date);
    if (!geckoDate) continue;

    if (priceCache.has(geckoDate)) {
      result[date] = priceCache.get(geckoDate)!;
      continue;
    }

    try {
      const url = `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${geckoDate}&localization=false`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const d = await r.json();
      const price: number = d?.market_data?.current_price?.usd ?? 0;
      if (price > 0) {
        priceCache.set(geckoDate, price);
        result[date] = price;
      }
    } catch {
      // skip failed dates
    }
  }

  return result;
}
