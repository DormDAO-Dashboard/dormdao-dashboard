import type { Metadata } from "next";
import { NewsClient } from "@/components/NewsClient";

export const metadata: Metadata = {
  title: "DAO Headlines — DormDAO",
  description: "News and updates from across the DormDAO network",
};

export default function NewsPage() {
  return <NewsClient />;
}
