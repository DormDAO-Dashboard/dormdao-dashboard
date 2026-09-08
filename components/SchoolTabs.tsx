"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/apiFetch";
import { getSchoolColors, accentBorderColor } from "@/lib/schoolColors";
import { mergeHoldingsByTicker } from "@/lib/holdings";
import { SchoolRowWithHoldings } from "@/lib/cache";
import { HoldingsTableClient } from "@/components/HoldingsTableClient";
import { PortfolioDonut } from "@/components/charts/PortfolioDonut";
import { SchoolHistory } from "@/components/SchoolHistory";
import { SchoolMembers } from "@/components/SchoolMembers";
import { SchoolDocuments } from "@/components/SchoolDocuments";
import { ExitedHoldingsTable } from "@/components/ExitedHoldingsTable";
import { SchoolPortfolioStats } from "@/components/SchoolPortfolioStats";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ForumClient } from "@/components/ForumClient";
import { VotingClient } from "@/components/VotingClient";
import { PurchasePriceEditorModal } from "@/components/PurchasePriceEditorModal";

const TABS = ["Portfolio", "Voting", "History", "Documents", "Members", "Forum"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  school: SchoolRowWithHoldings;
  otherSchools: Record<string, string[]>;
}

export function SchoolTabs({ school, otherSchools }: Props) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as Tab;
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab) ? initialTab : "Portfolio");
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const colors = getSchoolColors(school.slug);
  const boxBorder = accentBorderColor(colors.primary);

  // Local, mutable copy of the server-provided holdings — lets the purchase
  // price editor below update the displayed table immediately after a save
  // instead of waiting on a full server round-trip (which, on top of that,
  // would still serve the cached getSchoolsData() result for up to its
  // 10-minute revalidate window).
  const [holdings, setHoldings] = useState(school.holdings ?? []);
  const [canManagePositions, setCanManagePositions] = useState(false);
  const [showPriceEditor, setShowPriceEditor] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Dorm-wide admins only — deliberately not club leadership, even though
    // the underlying PATCH endpoint itself still allows a school's own
    // leadership too (canModerate, shared with position delete/other admin
    // actions there). This is just the pencil icon's visibility gate.
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      try {
        const res = await apiFetch("/api/admin/check");
        const { isAdmin } = await res.json() as { isAdmin: boolean };
        if (!cancelled) setCanManagePositions(isAdmin);
      } catch {
        // leave canManagePositions false
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  // The sheet sometimes lists the same ticker as multiple rows when a club
  // bought it in separate tranches — merge those for portfolio-level views
  // (table, chart, stats) so each token shows as a single position. The
  // Activity/Recent-Buys feeds read school.holdings directly elsewhere and
  // are unaffected, so a fresh tranche still shows up as its own recent buy.
  const mergedHoldings = holdings ? mergeHoldingsByTicker(holdings) : undefined;
  const mergedNftHoldings = school.nftHoldings ? mergeHoldingsByTicker(school.nftHoldings) : undefined;

  const editableHoldings = holdings
    .filter((h): h is typeof h & { positionId: string } => h.positionId != null)
    .map((h) => ({ positionId: h.positionId, ticker: h.ticker, investmentDate: h.investmentDate, purchasePriceUsd: h.purchasePriceUsd }));

  function handlePriceSaved(positionId: string, newPrice: number | null) {
    setHoldings((prev) => prev.map((h) => {
      if (h.positionId !== positionId) return h;
      const costBasisUsd = newPrice != null ? h.tokens * newPrice : null;
      const gainUsd = costBasisUsd != null && h.marketValueUsd != null ? h.marketValueUsd - costBasisUsd : undefined;
      const roiUsdPct = costBasisUsd && costBasisUsd > 0 && h.marketValueUsd != null
        ? ((h.marketValueUsd - costBasisUsd) / costBasisUsd) * 100
        : undefined;
      return { ...h, purchasePriceUsd: newPrice, gainUsd, roiUsdPct };
    }));
  }

  return (
    <>
      {/* Tab bar — horizontally scrollable on mobile where all 6 tabs don't
          fit; an edge fade hints there's more instead of just clipping. */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 right-0 w-8 pointer-events-none bg-gradient-to-l from-white dark:from-[#0a0a0a] to-transparent sm:hidden z-10" />
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={tab === t ? { borderColor: colors.primary } : {}}
              className={cn(
                "shrink-0 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                tab === t
                  ? "text-gray-900 dark:text-white font-medium"
                  : "border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-normal"
              )}
            >
              {t === "Members" && membersCount !== null ? `Members (${membersCount})` : t}
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio tab */}
      {tab === "Portfolio" && (
        <div className="flex flex-col gap-4">
          {(mergedHoldings?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div
                className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5"
                style={{ borderColor: boxBorder }}
              >
                <SectionHeading color={colors.primary} className="mb-4">Portfolio Concentration</SectionHeading>
                <PortfolioDonut holdings={mergedHoldings ?? []} nav={school.nav} />
              </div>

              <SchoolPortfolioStats
                holdings={mergedHoldings!}
                schoolName={school.name}
                nav={school.nav}
                rank={school.rank}
                color={colors.primary}
              />
            </div>
          )}

          <div
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden"
            style={{ borderColor: boxBorder }}
          >
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-3">
              <SectionHeading color={colors.primary}>
                Active Holdings ({mergedHoldings?.length ?? 0})
              </SectionHeading>
              {canManagePositions && (
                <button
                  onClick={() => setShowPriceEditor(true)}
                  title="Edit purchase prices"
                  className="shrink-0 p-1.5 rounded-lg text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {mergedHoldings && mergedHoldings.length > 0 ? (
              <HoldingsTableClient
                holdings={mergedHoldings}
                otherSchools={otherSchools}
                schoolName={school.name}
              />
            ) : (
              <p className="px-5 py-6 text-sm text-gray-700 dark:text-gray-400">No holdings data available.</p>
            )}
          </div>

          {(mergedNftHoldings?.length ?? 0) > 0 && (
            <div
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden"
              style={{ borderColor: boxBorder }}
            >
              <div className="px-5 py-4 border-b border-gray-800">
                <SectionHeading color={colors.primary}>
                  Active NFT Holdings ({mergedNftHoldings!.length})
                </SectionHeading>
              </div>
              <HoldingsTableClient
                holdings={mergedNftHoldings!}
                otherSchools={{}}
                schoolName={school.name}
              />
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === "History" && (
        <div className="flex flex-col gap-4">
          {(school.exitedHoldings?.length ?? 0) > 0 && (
            <div
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden"
              style={{ borderColor: boxBorder }}
            >
              <div className="px-5 py-4 border-b border-gray-800">
                <SectionHeading color={colors.primary}>
                  Exited &amp; Trimmed Positions ({school.exitedHoldings.length})
                </SectionHeading>
              </div>
              <ExitedHoldingsTable holdings={school.exitedHoldings} />
            </div>
          )}
          <SchoolHistory schoolName={school.name} />
        </div>
      )}

      {/* Members tab */}
      {tab === "Members" && (
        <SchoolMembers schoolName={school.name} onCountLoad={setMembersCount} />
      )}

      {/* Documents tab */}
      {tab === "Documents" && (
        <SchoolDocuments schoolName={school.name} />
      )}

      {/* Forum tab */}
      {tab === "Forum" && (
        <ForumClient school={school.name} />
      )}

      {/* Voting tab */}
      {tab === "Voting" && (
        <VotingClient slug={school.slug} schoolName={school.name} pageMode={false} />
      )}

      {showPriceEditor && (
        <PurchasePriceEditorModal
          schoolSlug={school.slug}
          rows={editableHoldings}
          onClose={() => setShowPriceEditor(false)}
          onSaved={handlePriceSaved}
        />
      )}
    </>
  );
}
