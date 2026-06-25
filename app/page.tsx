import { getSchoolsData } from "@/lib/cache";
import { LeaderboardClient } from "@/components/LeaderboardClient";

export const revalidate = 300;

export default async function LeaderboardPage() {
  const { schools, sinceInceptionSchools, schools2425, schools2324, fetchedAt } = await getSchoolsData();

  return (
    <LeaderboardClient
      schools={schools}
      sinceInceptionSchools={sinceInceptionSchools}
      schools2425={schools2425}
      schools2324={schools2324}
      fetchedAt={fetchedAt}
    />
  );
}
