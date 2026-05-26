"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatUSD, formatPct } from "@/lib/utils";
import { TOKEN_META } from "@/lib/tokens";
import { Skeleton } from "@/components/ui/Card";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { NoteCard } from "@/components/notes/NoteCard";
import { PriceLineChart } from "@/components/charts/PriceLineChart";
import { ResearchNote } from "@/lib/types";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

interface CoinDetail {
  marketCap: number | null;
  volume24h: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  ath: number | null;
  athChangePercent: number | null;
  fdv: number | null;
  high24h: number | null;
  low24h: number | null;
}

interface SchoolPosition {
  school: string;
  slug: string;
  tokens: number;
  costBasisEth: number;
  pctOfPortfolio: number;
}

export default function TokenDetailPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toLowerCase();
  const tickerUpper = ticker.toUpperCase();
  const meta = TOKEN_META[tickerUpper];

  const [price, setPrice] = useState<{ usd: number; usd_24h_change: number } | null>(null);
  const [coinDetail, setCoinDetail] = useState<CoinDetail | null>(null);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [schoolPositions, setSchoolPositions] = useState<SchoolPosition[]>([]);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(true);

  useEffect(() => {
    fetch(`/api/prices?tickers=${tickerUpper}`)
      .then((r) => r.json())
      .then((d) => setPrice(d.prices?.[tickerUpper] ?? null))
      .finally(() => setLoadingPrice(false));

    fetch(`/api/notes?token=${tickerUpper}`)
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []))
      .finally(() => setLoadingNotes(false));

    if (meta?.geckoId) {
      fetch(`/api/coin-detail?id=${meta.geckoId}`)
        .then((r) => r.json())
        .then((d) => setCoinDetail(d))
        .finally(() => setLoadingDetail(false));
    } else {
      setLoadingDetail(false);
    }

    fetch("/api/sheets")
      .then((r) => r.json())
      .then((d) => {
        const positions: SchoolPosition[] = [];
        for (const school of d.schools ?? []) {
          const h = school.holdings?.find((h: { ticker: string }) => h.ticker === tickerUpper);
          if (h) {
            positions.push({
              school: school.name,
              slug: school.slug,
              tokens: h.tokens,
              costBasisEth: h.costBasisEth,
              pctOfPortfolio: h.pctOfPortfolio,
            });
          }
        }
        setSchoolPositions(positions.sort((a, b) => b.tokens - a.tokens));
      })
      .finally(() => setLoadingSchools(false));
  }, [tickerUpper, meta?.geckoId]);

  const isUp = price ? price.usd_24h_change >= 0 : null;

  return (
    <div>
      <Link
        href="/tokens"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tokens
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="flex-1">
            <div className="text-sm text-gray-400 mb-1">{meta?.name ?? tickerUpper}</div>
            <h1 className="text-4xl font-bold font-mono text-white mb-4">${meta?.displayTicker ?? tickerUpper}</h1>
            {loadingPrice ? (
              <>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-20" />
              </>
            ) : price ? (
              <>
                <div className="text-3xl font-mono font-bold text-white">{formatUSD(price.usd)}</div>
                <div className={`flex items-center gap-1 text-sm font-mono mt-1 ${isUp ? "text-primary" : "text-danger"}`}>
                  {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {formatPct(price.usd_24h_change)} (24h)
                </div>
              </>
            ) : meta?.vault ? (
              <div className="inline-flex items-center gap-2">
                <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-800/50 px-2 py-1 rounded">Vault</span>
                <span className="text-gray-500 text-sm">DeFi vault position</span>
              </div>
            ) : meta?.premarket ? (
              <div className="inline-flex items-center gap-2">
                <span className="text-xs bg-orange-900/40 text-orange-300 border border-orange-800/50 px-2 py-1 rounded">Pre-market</span>
                <span className="text-gray-500 text-sm">Not yet listed on CoinGecko</span>
              </div>
            ) : (
              <div className="text-gray-500">Price unavailable</div>
            )}
          </div>

          {/* 24h range */}
          {coinDetail && (coinDetail.high24h || coinDetail.low24h) && (
            <div className="text-sm">
              <div className="text-xs text-gray-500 mb-2">24h Range</div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-danger">{coinDetail.low24h ? formatUSD(coinDetail.low24h) : "—"}</span>
                <span className="text-gray-600">→</span>
                <span className="text-primary">{coinDetail.high24h ? formatUSD(coinDetail.high24h) : "—"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Price chart */}
        {meta?.geckoId && (
          <div className="mt-6">
            <PriceLineChart geckoId={meta.geckoId} positive={isUp ?? true} />
          </div>
        )}
      </div>

      {/* Market stats */}
      {meta?.geckoId && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Market Stats</h2>
          {loadingDetail ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : coinDetail ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatItem label="Market Cap" value={coinDetail.marketCap ? formatUSD(coinDetail.marketCap, true) : "—"} />
              <StatItem label="24h Volume" value={coinDetail.volume24h ? formatUSD(coinDetail.volume24h, true) : "—"} />
              <StatItem label="FDV" value={coinDetail.fdv ? formatUSD(coinDetail.fdv, true) : "—"} />
              <StatItem label="Circulating Supply" value={coinDetail.circulatingSupply ? formatCompact(coinDetail.circulatingSupply) : "—"} />
              <StatItem
                label="ATH"
                value={coinDetail.ath ? formatUSD(coinDetail.ath) : "—"}
                sub={coinDetail.athChangePercent ? `${coinDetail.athChangePercent.toFixed(1)}% from ATH` : undefined}
                subColor={coinDetail.athChangePercent && coinDetail.athChangePercent < 0 ? "text-danger" : "text-primary"}
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Aggregate DormDAO Position card */}
      {!loadingSchools && schoolPositions.length > 0 && (() => {
        const totalTokens = schoolPositions.reduce((s, p) => s + p.tokens, 0);
        const totalCostEth = schoolPositions.reduce((s, p) => s + p.costBasisEth, 0);
        const totalValueUsd = price && totalTokens > 0 ? totalTokens * price.usd : 0;
        const convictionScore = Math.round((schoolPositions.length / 17) * 10);
        const ethPrice = price?.usd ?? 0;
        const costUsd = totalCostEth > 0 && ethPrice > 0 ? totalCostEth * ethPrice : null;
        const pnl = costUsd !== null && totalValueUsd > 0 ? totalValueUsd - costUsd : null;
        const isProfitable = pnl !== null ? pnl > 0 : null;

        return (
          <div className={`rounded-xl border p-5 mb-6 ${isProfitable === true ? "border-primary/30 bg-primary/5" : isProfitable === false ? "border-danger/30 bg-danger/5" : "border-gray-800 bg-gray-900/50"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">Aggregate DormDAO Position</h2>
              <div className="flex items-center gap-2">
                {isProfitable !== null && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isProfitable ? "bg-primary/20 text-primary" : "bg-danger/20 text-danger"}`}>
                    {isProfitable ? "DAO In Profit" : "DAO at Loss"}
                  </span>
                )}
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                  Conviction: {convictionScore}/10
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Schools Holding</div>
                <div className="font-mono font-bold text-white">{schoolPositions.length}/17</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Tokens</div>
                <div className="font-mono font-bold text-white">
                  {totalTokens > 0 ? totalTokens.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Value</div>
                <div className="font-mono font-bold text-white">
                  {totalValueUsd > 0 ? formatUSD(totalValueUsd, true) : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">DAO P&amp;L</div>
                <div className={`font-mono font-bold ${pnl === null ? "text-gray-500" : pnl >= 0 ? "text-primary" : "text-danger"}`}>
                  {pnl !== null ? `${pnl >= 0 ? "+" : ""}${formatUSD(pnl, true)}` : "—"}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Held by DormDAO */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">
            Held by DormDAO ({loadingSchools ? "…" : schoolPositions.length} school{schoolPositions.length !== 1 ? "s" : ""})
          </h2>
        </div>
        {loadingSchools ? (
          <div className="p-4 flex flex-col gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : schoolPositions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No DormDAO school holds ${tickerUpper}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="text-left px-5 py-3">School</th>
                  <th className="text-right px-5 py-3">Tokens</th>
                  <th className="text-right px-5 py-3">Cost (ETH)</th>
                  <th className="text-right px-5 py-3">% of Portfolio</th>
                  {price && <th className="text-right px-5 py-3">Value (USD)</th>}
                </tr>
              </thead>
              <tbody>
                {schoolPositions.map((pos) => (
                  <tr key={pos.slug} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-5 py-3">
                      <Link
                        href={`/schools/${pos.slug}`}
                        className="text-white hover:text-primary font-medium transition-colors"
                      >
                        {pos.school}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      {pos.tokens > 0
                        ? pos.tokens.toLocaleString(undefined, { maximumFractionDigits: 4 })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      {pos.costBasisEth > 0 ? `${pos.costBasisEth} ETH` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-400">
                      {pos.pctOfPortfolio > 0 ? `${pos.pctOfPortfolio.toFixed(1)}%` : "—"}
                    </td>
                    {price && (
                      <td className="px-5 py-3 text-right font-mono text-gray-300">
                        {pos.tokens > 0 ? formatUSD(pos.tokens * price.usd, true) : "—"}
                      </td>
                    )}
                  </tr>
                ))}
                {schoolPositions.length > 1 && (() => {
                  const totalTokens = schoolPositions.reduce((s, p) => s + p.tokens, 0);
                  const totalCostEth = schoolPositions.reduce((s, p) => s + p.costBasisEth, 0);
                  const totalValueUsd = price && totalTokens > 0 ? totalTokens * price.usd : 0;
                  return (
                    <tr className="bg-gray-800/30 font-semibold">
                      <td className="px-5 py-3 text-xs text-gray-400 uppercase tracking-wide">DormDAO Total</td>
                      <td className="px-5 py-3 text-right font-mono text-white">
                        {totalTokens > 0 ? totalTokens.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-white">
                        {totalCostEth > 0 ? `${totalCostEth.toFixed(4)} ETH` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-400">—</td>
                      {price && (
                        <td className="px-5 py-3 text-right font-mono text-white">
                          {totalValueUsd > 0 ? formatUSD(totalValueUsd, true) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Research notes */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Research Notes for ${tickerUpper}</h2>
        <AddNoteForm
          defaultTicker={tickerUpper}
          onSuccess={() => {
            fetch(`/api/notes?token=${tickerUpper}`)
              .then((r) => r.json())
              .then((d) => setNotes(d.notes ?? []));
          }}
        />
        <div className="flex flex-col gap-3 mt-4">
          {loadingNotes
            ? [...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-12 w-full mb-3" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))
            : notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
          {!loadingNotes && notes.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No research notes for ${tickerUpper} yet. Be the first!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatItem({
  label, value, sub, subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-mono font-semibold text-gray-200">{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${subColor ?? "text-gray-500"}`}>{sub}</div>}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString();
}
