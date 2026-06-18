import type { Metadata } from "next";
import { ResearchTabs } from "@/components/ResearchTabs";

export const metadata: Metadata = {
  title: "DormDocs — DormDAO",
  description: "Investment pitches and research from the DormDAO ecosystem",
};

export default function ResearchPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResearchTabs initialTickers={[]} />
    </main>
  );
}
