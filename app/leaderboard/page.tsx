import { getSchoolsData } from "@/lib/cache";
import { LeaderboardClient } from "@/components/LeaderboardClient";

// Deliberately dynamic (not `revalidate = 600`) — this page's own
// route-level ISR cache used to refresh on its own independent 10-minute
// clock, separate from getSchoolsData()'s unstable_cache (also 600s) that
// every other reader of this data (the school pages, /api/sheets) goes
// through. The two windows didn't line up, so this page could keep
// rendering an older data-cache snapshot for up to 10 minutes after
// /schools/[slug] (which has no page-level cache of its own) had already
// moved on to a newer one — same NAV, different numbers on two pages at
// once. Forcing this page to always re-render per request removes that
// second cache layer entirely; getSchoolsData()'s own 600s cache still
// does the actual rate-limiting of upstream fetches.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const { schools, sinceInceptionSchools, schools2526, schools2425, schools2324, fetchedAt } = await getSchoolsData();

  return (
    <LeaderboardClient
      schools={schools}
      sinceInceptionSchools={sinceInceptionSchools}
      schools2526={schools2526}
      schools2425={schools2425}
      schools2324={schools2324}
      fetchedAt={fetchedAt}
    />
  );
}
