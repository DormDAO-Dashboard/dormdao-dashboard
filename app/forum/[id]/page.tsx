import type { Metadata } from "next";
import { ForumThreadClient } from "@/components/ForumThreadClient";

export const metadata: Metadata = {
  title: "DAO Forum — DormDAO",
};

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ForumThreadClient threadId={id} />
    </main>
  );
}
