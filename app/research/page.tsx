import type { Metadata } from "next";
import { ResearchTabs } from "@/components/ResearchTabs";

export const metadata: Metadata = {
  title: "DormDocs — Dorm™",
  description: "Investment pitches and research from the Dorm™ ecosystem",
};

export default function ResearchPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchTabs initialTickers={[]} />
    </main>
  );
}
