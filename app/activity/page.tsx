import { getSchoolsData } from "@/lib/cache";
import { ActivityTabs } from "@/components/ActivityTabs";
import { SyncFooter } from "@/components/SyncFooter";

export const revalidate = 300;

export default async function ActivityPage() {
  const { schools, fetchedAt } = await getSchoolsData();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Activity Feed</h1>
        <p className="text-gray-500 mt-1 text-sm">All position entries and trims across 17 university DAOs.</p>
      </div>
      <ActivityTabs schools={schools} />
      <SyncFooter fetchedAt={fetchedAt} />
    </div>
  );
}
