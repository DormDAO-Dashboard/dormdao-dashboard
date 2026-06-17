import type { Metadata } from "next";
import { NewsClient } from "@/components/NewsClient";

export const metadata: Metadata = {
  title: "DAO Headlines — DormDAO",
  description: "News and updates from across the DormDAO network",
};

export default function NewsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <NewsClient />
    </main>
  );
}
