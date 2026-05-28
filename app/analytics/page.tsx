import { getSchoolsData } from "@/lib/cache";
import { DashboardClient } from "@/components/DashboardClient";

export const revalidate = 300;

export default async function AnalyticsPage() {
  const { schools, sinceInceptionSchools, fetchedAt } = await getSchoolsData();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Portfolio charts, statistics, and performance breakdown across all 17 DAOs.</p>
      </div>
      <DashboardClient schools={schools} sinceInceptionSchools={sinceInceptionSchools} fetchedAt={fetchedAt} />
    </div>
  );
}
