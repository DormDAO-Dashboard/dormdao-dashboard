import { getSchoolsData } from "@/lib/cache";
import { DashboardClient } from "@/components/DashboardClient";

export const revalidate = 600;

export default async function AnalyticsPage() {
  const { schools, sinceInceptionSchools, schools2425, schools2324, fetchedAt } = await getSchoolsData();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-700 dark:text-gray-400 mt-0.5 text-sm">Portfolio charts, statistics, and performance breakdown across all 17 DAOs.</p>
      </div>
      <DashboardClient
        schools={schools}
        sinceInceptionSchools={sinceInceptionSchools}
        schools2425={schools2425}
        schools2324={schools2324}
        fetchedAt={fetchedAt}
      />
    </div>
  );
}
