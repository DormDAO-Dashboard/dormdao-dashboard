import { getSchoolsData, getAllPrices } from "@/lib/cache";
import { TokensClient } from "@/components/TokensClient";
import type { TokenInfo } from "@/components/TokensClient";

export const revalidate = 300;

export default async function TokensPage() {
  const [{ schools, tokenToSchools }, { prices }] = await Promise.all([
    getSchoolsData(),
    getAllPrices(),
  ]);

  // Aggregate per-ticker info from all school holdings
  const map = new Map<string, { totalTokens: number; chains: Set<string> }>();
  for (const school of schools) {
    for (const h of school.holdings ?? []) {
      const entry = map.get(h.ticker) ?? { totalTokens: 0, chains: new Set<string>() };
      entry.totalTokens += h.tokens;
      if (h.blockchain) entry.chains.add(h.blockchain);
      map.set(h.ticker, entry);
    }
  }

  const tokens: TokenInfo[] = Array.from(map.entries())
    .map(([ticker, { totalTokens, chains }]) => {
      const schoolNames = tokenToSchools[ticker] ?? [];
      return {
        ticker,
        schoolCount: schoolNames.length,
        schools: schoolNames,
        totalTokens,
        chains: Array.from(chains),
      };
    })
    .sort((a, b) => b.schoolCount - a.schoolCount || a.ticker.localeCompare(b.ticker));

  return <TokensClient initialTokens={tokens} initialPrices={prices} />;
}
