import { getSchoolsData } from "@/lib/cache";
import { LeaderboardClient } from "@/components/LeaderboardClient";
import { SyncFooter } from "@/components/SyncFooter";

export const revalidate = 300;

export default async function LeaderboardPage() {
  const { schools, sinceInceptionSchools, schools2425, schools2324, fetchedAt } = await getSchoolsData();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Leaderboard</h1>
        <p className="text-gray-500 mt-0.5 text-sm">University DAO rankings across all seasons.</p>
      </div>
      <LeaderboardClient
        schools={schools}
        sinceInceptionSchools={sinceInceptionSchools}
        schools2425={schools2425}
        schools2324={schools2324}
      />
      <SyncFooter fetchedAt={fetchedAt} />
    </div>
  );
}
