import { getSchoolsData } from "@/lib/cache";
import { ResearchTabs } from "@/components/ResearchTabs";

export const revalidate = 300;

export default async function ResearchPage() {
  const { schools } = await getSchoolsData();

  const tickers = [...new Set(
    schools.flatMap((s) => s.holdings?.map((h) => h.ticker) ?? [])
  )].sort();

  return (
    <div className="max-w-7xl mx-auto">
      <ResearchTabs initialTickers={tickers} />
    </div>
  );
}
