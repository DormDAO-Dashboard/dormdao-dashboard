import { getSchoolsData } from "@/lib/cache";
import { SchoolsClient } from "@/components/SchoolsClient";
import { SCHOOL_NAMES } from "@/lib/schoolData";
import { slugify } from "@/lib/utils";
import type { SchoolRow } from "@/lib/types";

// Fallback roster shown when the live portfolio sheet is down — the member
// list itself never depends on that data, only the stats do.
const FALLBACK_SCHOOLS: SchoolRow[] = SCHOOL_NAMES.map((name, i) => ({
  rank: i + 1,
  name,
  slug: slugify(name),
  nav: 0,
  usdReturn: 0,
  ethReturn: 0,
  avgEntryFdv: 0,
  pctDeployed: 0,
}));

export default async function SchoolsPage() {
  const { schools } = await getSchoolsData();
  const statsUnavailable = schools.length === 0;
  const displaySchools = statsUnavailable ? FALLBACK_SCHOOLS : schools;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">School Portfolios</h1>
        <p className="text-gray-700 dark:text-gray-400 mt-1 text-sm">
          All {displaySchools.length} DormDAO member universities
        </p>
      </div>
      <SchoolsClient initialSchools={displaySchools} statsUnavailable={statsUnavailable} />
    </div>
  );
}
