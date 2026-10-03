import { getSchoolsData } from "@/lib/cache";
import { ActivityTabs } from "@/components/ActivityTabs";
import { SyncFooter } from "@/components/SyncFooter";

// See app/leaderboard/page.tsx for why this is force-dynamic rather than
// revalidate = 600 — avoids a second, independently-timed route cache on
// top of getSchoolsData()'s own.
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const { schools, fetchedAt } = await getSchoolsData();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Activity Feed</h1>
        <p className="text-gray-700 dark:text-gray-400 mt-1 text-sm">All position entries and trims across 17 university DAOs.</p>
      </div>
      <ActivityTabs schools={schools} />
      <SyncFooter fetchedAt={fetchedAt} />
    </div>
  );
}
