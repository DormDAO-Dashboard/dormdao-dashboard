"use client";
import { useEffect, useState } from "react";
import { SchoolRow } from "@/lib/types";
import { formatNav } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";
import Link from "next/link";

interface EthRow {
  name: string;
  slug: string;
  ethTokens: number;
  usdValue: number;
}

export function EthHoldingsTable({ schools }: { schools: SchoolRow[] }) {
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/prices?tickers=ETH")
      .then((r) => r.json())
      .then((data) => {
        const price = data?.prices?.ETH?.usd;
        if (price) setEthPrice(price);
      })
      .catch(() => {});
  }, []);

  const rows: EthRow[] = schools
    .map((school) => {
      const eth = school.holdings?.find((h) => h.ticker === "ETH");
      const ethTokens = eth?.tokens ?? null;
      if (ethTokens === null) return null;
      return {
        name: school.name,
        slug: school.slug,
        ethTokens,
        usdValue: ethPrice !== null ? ethTokens * ethPrice : 0,
      };
    })
    .filter((r): r is EthRow => r !== null)
    .sort((a, b) => b.ethTokens - a.ethTokens);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">ETH Holdings</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">School</th>
            <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">ETH Holdings</th>
            <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">USD Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const negative = row.ethTokens < 0;
            const valueColor = negative ? "text-danger" : "text-gray-900 dark:text-white";
            return (
              <tr
                key={row.slug}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                  i === rows.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/schools/${row.slug}`}
                    className="text-gray-900 dark:text-white hover:text-primary transition-colors"
                  >
                    {schoolDisplayName(row.name)}
                  </Link>
                </td>
                <td className={`px-5 py-3 text-right font-mono ${valueColor}`}>
                  {row.ethTokens.toFixed(4)} ETH
                </td>
                <td className={`px-5 py-3 text-right font-mono ${valueColor}`}>
                  {ethPrice !== null ? formatNav(row.usdValue) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
