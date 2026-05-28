import { getSchoolsData } from "@/lib/cache";
import { ActivityClient } from "@/components/ActivityClient";
import { TrimsAndSells } from "@/components/TrimsAndSells";

export const revalidate = 300;

export default async function ActivityPage() {
  const { schools } = await getSchoolsData();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Activity Feed</h1>
        <p className="text-gray-400 mt-1">All position entries across 17 university DAOs — sorted by date, filterable by school, token, and date range.</p>
      </div>
      <TrimsAndSells />
      <ActivityClient schools={schools} />
    </div>
  );
}
