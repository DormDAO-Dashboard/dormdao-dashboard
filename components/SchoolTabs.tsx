"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SchoolRowWithHoldings } from "@/lib/cache";
import { HoldingsTableClient } from "@/components/HoldingsTableClient";
import { PortfolioDonut } from "@/components/charts/PortfolioDonut";
import { SchoolHistory } from "@/components/SchoolHistory";
import { SchoolMembers } from "@/components/SchoolMembers";
import { SchoolDocuments } from "@/components/SchoolDocuments";
import { ExitedHoldingsTable } from "@/components/ExitedHoldingsTable";
import { SchoolPortfolioStats } from "@/components/SchoolPortfolioStats";

const TABS = ["Portfolio", "History", "Members", "Documents"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  school: SchoolRowWithHoldings;
  otherSchools: Record<string, string[]>;
}

export function SchoolTabs({ school, otherSchools }: Props) {
  const [tab, setTab] = useState<Tab>("Portfolio");

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-800 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-white font-medium"
                : "border-transparent text-gray-500 hover:text-gray-300 font-normal"
            )}
          >
            {t}
            {t === "Members" && null}
          </button>
        ))}
      </div>

      {/* Portfolio tab */}
      {tab === "Portfolio" && (
        <div className="flex flex-col gap-6">
          {(school.holdings?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Portfolio Concentration</h2>
              <PortfolioDonut holdings={school.holdings ?? []} nav={school.nav} />
            </div>
          )}

          {(school.holdings?.length ?? 0) > 0 && (
            <SchoolPortfolioStats
              holdings={school.holdings!}
              schoolName={school.name}
              nav={school.nav}
              rank={school.rank}
            />
          )}

          <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300">
                Active Holdings ({school.holdings?.length ?? 0})
              </h2>
            </div>
            {school.holdings && school.holdings.length > 0 ? (
              <HoldingsTableClient
                holdings={school.holdings}
                otherSchools={otherSchools}
                schoolName={school.name}
              />
            ) : (
              <p className="px-5 py-6 text-sm text-gray-500">No holdings data available.</p>
            )}
          </div>

          {(school.nftHoldings?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">
                  Active NFT Holdings ({school.nftHoldings.length})
                </h2>
              </div>
              <HoldingsTableClient
                holdings={school.nftHoldings}
                otherSchools={{}}
                schoolName={school.name}
              />
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === "History" && (
        <div className="flex flex-col gap-6">
          <SchoolHistory schoolName={school.name} />
          {(school.exitedHoldings?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">
                  Exited &amp; Trimmed Positions ({school.exitedHoldings.length})
                </h2>
              </div>
              <ExitedHoldingsTable holdings={school.exitedHoldings} />
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === "Members" && (
        <SchoolMembers schoolName={school.name} />
      )}

      {/* Documents tab */}
      {tab === "Documents" && (
        <SchoolDocuments schoolName={school.name} />
      )}
    </>
  );
}
