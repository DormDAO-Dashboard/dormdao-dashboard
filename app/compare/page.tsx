import type { Metadata } from "next";
import { ComparePageClient } from "@/components/ComparePageClient";

export const metadata: Metadata = {
  title: "Compare Notes — DormDAO",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ComparePageClient ids={ids ?? ""} />
    </main>
  );
}
