"use client";
import { useState } from "react";
import { ActivityClient } from "@/components/ActivityClient";
import { TrimsAndSells } from "@/components/TrimsAndSells";
import { SchoolRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "buys", label: "Position Entries" },
  { key: "sells", label: "Trims & Exits" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function ActivityTabs({ schools }: { schools: SchoolRow[] }) {
  const [tab, setTab] = useState<Tab>("buys");

  return (
    <>
      <div className="flex gap-1.5 mb-6 border-b border-gray-800 pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "buys" && <ActivityClient schools={schools} />}
      {tab === "sells" && <TrimsAndSells />}
    </>
  );
}
