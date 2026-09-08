import type { Metadata } from "next";
import { NewsClient } from "@/components/NewsClient";

export const metadata: Metadata = {
  title: "DAO Headlines — Dorm™",
  description: "News and updates from across the Dorm™ network",
};

export default function NewsPage() {
  return <NewsClient />;
}
