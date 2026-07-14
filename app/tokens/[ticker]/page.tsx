"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatUSD, formatPrice, formatPct } from "@/lib/utils";
import { TOKEN_META } from "@/lib/tokens";
import { schoolDisplayName } from "@/lib/schoolData";
import { Skeleton } from "@/components/ui/Card";
import { PriceLineChart } from "@/components/charts/PriceLineChart";
import { FundDocuments } from "@/components/FundDocuments";
import { ForumClient } from "@/components/ForumClient";
import { ArrowLeft, TrendingUp, TrendingDown, Upload } from "lucide-react";
import { ADMIN_SECRET } from "@/lib/admin";

const BASE = "https://classic.artemis.ai/asset/";
const ARTEMIS_URL: Record<string, string> = {
  ETH:    BASE + "ethereum",
  SOL:    BASE + "solana",
  HYPE:   BASE + "hyperliquid",
  LINK:   BASE + "chainlink",
  CBBTC:  BASE + "bitcoin",
  TAO:    BASE + "bittensor",
  JUP:    BASE + "jupiter",
  ONDO:   BASE + "ondo-finance",
  PENDLE: BASE + "pendle",
  AAVE:   BASE + "aave",
  SKY:    BASE + "sky",
  ENA:    BASE + "ethena",
  JTO:    BASE + "jito",
  FET:    BASE + "fetch-ai",
  AVAX:   BASE + "avalanche",
  BNB:    BASE + "bnb",
  ZRO:    BASE + "layerzero",
  CRV:    BASE + "curve-dao-token",
  SAND:   BASE + "sandbox",
  HNT:    BASE + "helium",
  GRAIL:  BASE + "camelot",
  GRASS:  BASE + "grass",
};

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
  gainUsd?: number;
  roiUsdPct?: number;
}

function AdminDocUpload({ ticker, onUploaded }: { ticker: string; onUploaded: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", school: "", document_date: "", document_type: "report",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setIsAdmin(new URLSearchParams(window.location.search).has("admin"));
  }, []);

  if (!isAdmin) return null;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setResult("Please select a PDF file."); return; }
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("ticker", ticker);
    fd.append("title", form.title);
    if (form.school) fd.append("school", form.school);
    if (form.document_date) fd.append("document_date", form.document_date);
    fd.append("document_type", form.document_type);
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
        body: fd,
      });
      const data = await res.json();
      if (data.error) {
        setResult(`Error: ${data.error}`);
      } else {
        setResult("Uploaded successfully!");
        setForm({ title: "", school: "", document_date: "", document_type: "report" });
        setFile(null);
        setOpen(false);
        onUploaded();
      }
    } catch {
      setResult("Network error");
    } finally {
      setUploading(false);
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-gray-500";

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-600/20 border border-yellow-600/40 text-yellow-400 text-xs hover:bg-yellow-600/30 transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        {open ? "Cancel Upload" : "Upload Document"}
      </button>
      {result && <p className="text-xs text-yellow-300 mt-1">{result}</p>}
      {open && (
        <form onSubmit={handleUpload} className="mt-3 p-4 rounded-xl border border-yellow-900/50 bg-yellow-900/10 flex flex-col gap-3">
          <div className="text-xs font-medium text-yellow-400 mb-1">Upload Fund Document — ${ticker}</div>
          <input
            required
            placeholder="Title (e.g. Hyperliquid $HYPE — Pitch Deck)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="School (e.g. Oregon)"
              value={form.school}
              onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
              className={inputCls}
            />
            <input
              type="date"
              value={form.document_date}
              onChange={(e) => setForm((f) => ({ ...f, document_date: e.target.value }))}
              className={inputCls}
            />
          </div>
          <select
            value={form.document_type}
            onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))}
            className={inputCls}
          >
            <option value="report">Fund Report</option>
            <option value="pitch_deck">Pitch Deck</option>
            <option value="other">Other</option>
          </select>
          <input
            required
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-gray-600 file:bg-gray-800 file:text-gray-300 file:text-xs hover:file:border-gray-500 cursor-pointer"
          />
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 rounded-lg bg-yellow-600/30 border border-yellow-600/50 text-yellow-300 text-sm font-medium hover:bg-yellow-600/40 transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function TokenDetailPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toLowerCase();
  const tickerUpper = ticker.toUpperCase();
  const meta = TOKEN_META[tickerUpper];

  const [price, setPrice] = useState<{ usd: number; usd_24h_change: number } | null>(null);
  const [ethPrice, setEthPrice] = useState(0);
  const [coinDetail, setCoinDetail] = useState<CoinDetail | null>(null);
  const [schoolPositions, setSchoolPositions] = useState<SchoolPosition[]>([]);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [docsKey, setDocsKey] = useState(0);
  const [adminSecret, setAdminSecret] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("admin")) setAdminSecret(ADMIN_SECRET);
  }, []);

  useEffect(() => {
    // Fetch token price + ETH price together so cost basis can be converted to USD
    fetch(`/api/prices?tickers=${tickerUpper},ETH`)
      .then((r) => r.json())
      .then((d) => {
        setPrice(d.prices?.[tickerUpper] ?? null);
        setEthPrice(d.prices?.ETH?.usd ?? 0);
      })
      .finally(() => setLoadingPrice(false));

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
          const matches = (school.holdings ?? []).filter(
            (h: { ticker: string }) => h.ticker === tickerUpper
          );
          if (matches.length === 0) continue;
          // Aggregate all positions for this ticker at this school
          const tokens = matches.reduce((s: number, h: { tokens: number }) => s + h.tokens, 0);
          const costBasisEth = matches.reduce((s: number, h: { costBasisEth: number }) => s + h.costBasisEth, 0);
          const pctOfPortfolio = matches.reduce((s: number, h: { pctOfPortfolio: number }) => s + h.pctOfPortfolio, 0);
          const hasGain = matches.some((h: { gainUsd?: number }) => h.gainUsd !== undefined);
          const gainUsd = hasGain
            ? matches.reduce((s: number, h: { gainUsd?: number }) => s + (h.gainUsd ?? 0), 0)
            : undefined;
          // ROI % only meaningful for a single position; hide for aggregated multiple positions
          const roiUsdPct = matches.length === 1 ? matches[0].roiUsdPct : undefined;
          positions.push({
            school: school.name,
            slug: school.slug,
            tokens,
            costBasisEth,
            pctOfPortfolio,
            gainUsd,
            roiUsdPct,
          });
        }
        setSchoolPositions(positions.sort((a, b) => b.tokens - a.tokens));
      })
      .finally(() => setLoadingSchools(false));
  }, [tickerUpper, meta?.geckoId]);

  const isUp = price ? price.usd_24h_change >= 0 : null;

  return (
    <div>
      <AdminDocUpload ticker={tickerUpper} onUploaded={() => setDocsKey((k) => k + 1)} />
      <Link
        href="/tokens"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tokens
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 mb-6">
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
                <div className="text-3xl font-mono font-bold text-white">{formatPrice(price.usd)}</div>
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
                <span className="text-danger">{coinDetail.low24h ? formatPrice(coinDetail.low24h) : "—"}</span>
                <span className="text-gray-600">→</span>
                <span className="text-primary">{coinDetail.high24h ? formatPrice(coinDetail.high24h) : "—"}</span>
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
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Market Stats</h2>
            <a
              href={ARTEMIS_URL[tickerUpper] ?? "https://classic.artemis.ai/assets"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 border border-gray-700/60 hover:border-gray-500 hover:text-gray-300 px-2.5 py-1 rounded-md transition-colors"
            >
              View On-Chain Data → Artemis
            </a>
          </div>
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
                value={coinDetail.ath ? formatPrice(coinDetail.ath) : "—"}
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
        // Use sheet gainUsd sum when available (same method as table total row)
        const hasSheetGain = schoolPositions.some((p) => p.gainUsd !== undefined);
        const pnl = hasSheetGain
          ? schoolPositions.reduce((s, p) => s + (p.gainUsd ?? 0), 0)
          : (() => {
              const costUsd = totalCostEth > 0 && ethPrice > 0 ? totalCostEth * ethPrice : null;
              return costUsd !== null && totalValueUsd > 0 ? totalValueUsd - costUsd : null;
            })();
        const isProfitable = pnl !== null ? pnl > 0 : null;

        return (
          <div className={`rounded-lg border p-5 mb-6 ${isProfitable === true ? "border-primary/30 bg-primary/5" : isProfitable === false ? "border-danger/30 bg-danger/5" : "border-gray-800 bg-gray-900/30"}`}>
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
                  {totalValueUsd > 0 ? formatUSD(totalValueUsd) : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">DAO P&amp;L</div>
                <div className={`font-mono font-bold ${pnl === null ? "text-gray-500" : pnl >= 0 ? "text-primary" : "text-danger"}`}>
                  {pnl !== null ? `${pnl >= 0 ? "+" : ""}${formatUSD(pnl)}` : "—"}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Held by DormDAO */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden mb-6">
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
                  {price && <th className="text-right px-5 py-3">P&amp;L</th>}
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
                        {schoolDisplayName(pos.school)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      {pos.tokens !== 0
                        ? pos.tokens.toLocaleString(undefined, { maximumFractionDigits: 4 })
                        : "0.00"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      {pos.costBasisEth > 0 ? `${pos.costBasisEth} ETH` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-400">
                      {pos.pctOfPortfolio > 0 ? `${pos.pctOfPortfolio.toFixed(1)}%` : "—"}
                    </td>
                    {price && (
                      <td className="px-5 py-3 text-right font-mono text-gray-300">
                        {pos.tokens !== 0 ? formatUSD(pos.tokens * price.usd) : formatUSD(0)}
                      </td>
                    )}
                    {price && (() => {
                      // Prefer sheet's pre-computed gain; fall back to derived from cost basis
                      const sheetGain = pos.gainUsd;
                      const computedGain = pos.tokens !== 0 && pos.costBasisEth > 0 && ethPrice > 0
                        ? pos.tokens * price.usd - pos.costBasisEth * ethPrice
                        : null;
                      const pnl = sheetGain !== undefined ? sheetGain : computedGain;
                      const pnlPct = pos.roiUsdPct !== undefined ? pos.roiUsdPct : null;
                      return (
                        <td className="px-5 py-3 text-right font-mono">
                          {pnl !== null && pnl !== undefined ? (
                            <span className={pnl >= 0 ? "text-primary" : "text-danger"}>
                              {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                              {pnlPct !== null && (
                                <span className="text-xs ml-1 opacity-70">
                                  ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      );
                    })()}
                  </tr>
                ))}
                {schoolPositions.length > 1 && (() => {
                  const totalTokens = schoolPositions.reduce((s, p) => s + p.tokens, 0);
                  const totalCostEth = schoolPositions.reduce((s, p) => s + p.costBasisEth, 0);
                  const totalValueUsd = price && totalTokens !== 0 ? totalTokens * price.usd : 0;
                  // Sum sheet gain if available for any position; else fall back to cost-derived
                  const hasSheetGain = schoolPositions.some((p) => p.gainUsd !== undefined);
                  const totalPnl = hasSheetGain
                    ? schoolPositions.reduce((s, p) => s + (p.gainUsd ?? 0), 0)
                    : (() => {
                        const totalCostUsd = totalCostEth > 0 && ethPrice > 0 ? totalCostEth * ethPrice : null;
                        return totalValueUsd > 0 && totalCostUsd !== null ? totalValueUsd - totalCostUsd : null;
                      })();
                  const totalCostUsd = totalCostEth > 0 && ethPrice > 0 ? totalCostEth * ethPrice : null;
                  const totalPnlPct = totalPnl !== null && totalCostUsd !== null && totalCostUsd > 0
                    ? (totalPnl / totalCostUsd) * 100 : null;
                  return (
                    <tr className="bg-gray-800/30 font-semibold">
                      <td className="px-5 py-3 text-xs text-gray-400 uppercase tracking-wide">DormDAO Total</td>
                      <td className="px-5 py-3 text-right font-mono text-white">
                        {totalTokens !== 0 ? totalTokens.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-white">
                        {totalCostEth > 0 ? `${totalCostEth.toFixed(4)} ETH` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-400">—</td>
                      {price && (
                        <td className="px-5 py-3 text-right font-mono text-white">
                          {totalValueUsd !== 0 ? formatUSD(totalValueUsd) : "—"}
                        </td>
                      )}
                      {price && (
                        <td className="px-5 py-3 text-right font-mono">
                          {totalPnl !== null ? (
                            <span className={totalPnl >= 0 ? "text-primary" : "text-danger"}>
                              {totalPnl >= 0 ? "+" : ""}{formatUSD(totalPnl)}
                              {totalPnlPct !== null && (
                                <span className="text-xs ml-1 opacity-70">
                                  ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
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

      {/* Fund Documents */}
      <FundDocuments ticker={tickerUpper} refreshKey={docsKey} />

      {/* Forum Discussions */}
      <div className="mt-8">
        <ForumClient ticker={tickerUpper} />
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
