import type { Metadata } from "next";
import { ForumClient } from "@/components/ForumClient";

export const metadata: Metadata = {
  title: "DAO Forum — DormDAO",
  description: "Discuss pitches, strategies, and ideas across the DormDAO network",
};

export default function ForumPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ForumClient />
    </main>
  );
}
