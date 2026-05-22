import { getSchoolsData, getAllPrices } from "@/lib/cache";
import { TokensClient, TokenInfo } from "@/components/TokensClient";

export default async function TokensPage() {
  const [{ schools }, { prices }] = await Promise.all([
    getSchoolsData(),
    getAllPrices(),
  ]);

  const map = new Map<string, { schools: Set<string>; totalTokens: number; chains: Set<string> }>();
  for (const school of schools) {
    for (const h of school.holdings ?? []) {
      if (!h.ticker) continue;
      if (!map.has(h.ticker)) {
        map.set(h.ticker, { schools: new Set(), totalTokens: 0, chains: new Set() });
      }
      const entry = map.get(h.ticker)!;
      entry.schools.add(school.name);
      entry.totalTokens += h.tokens ?? 0;
      if (h.blockchain) entry.chains.add(h.blockchain);
    }
  }

  const tokens: TokenInfo[] = Array.from(map.entries()).map(([ticker, v]) => ({
    ticker,
    schoolCount: v.schools.size,
    schools: Array.from(v.schools).sort(),
    totalTokens: v.totalTokens,
    chains: Array.from(v.chains),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Tokens</h1>
        <p className="text-gray-400 mt-1">{tokens.length} tokens held across DormDAO portfolios</p>
      </div>
      <TokensClient initialTokens={tokens} initialPrices={prices} />
    </div>
  );
}
