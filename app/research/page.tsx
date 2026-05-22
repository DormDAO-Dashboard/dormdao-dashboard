import { getSchoolsData } from "@/lib/cache";
import { ResearchClient } from "@/components/ResearchClient";

export default async function ResearchPage() {
  const { schools } = await getSchoolsData();

  const tickers = [...new Set(
    schools.flatMap((s) => s.holdings?.map((h) => h.ticker) ?? [])
  )].sort();

  return <ResearchClient initialTickers={tickers} />;
}
