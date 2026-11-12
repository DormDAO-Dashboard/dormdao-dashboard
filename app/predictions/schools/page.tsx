import { requirePredictionsAccess } from "@/lib/predictions/access";
import { loadSchoolRecords } from "@/lib/predictions/schoolRecords";
import { PredictionSchoolsClient } from "@/components/predictions/PredictionSchoolsClient";

export const revalidate = 60;

// Predictions Schools tab — modeled on the main /schools page. Oregon is the
// only school for now, and all pitches/trades are its own.
export default async function PredictionSchoolsPage() {
  // Gate in the page itself, not only the layout: Next renders layouts and
  // pages in parallel, so a layout-only check still streams page data.
  await requirePredictionsAccess();
  const schools = await loadSchoolRecords();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">School Prediction Markets</h1>
        <p className="text-gray-700 dark:text-gray-400 mt-1 text-sm">
          {schools.length} Dorm™ member {schools.length === 1 ? "university" : "universities"}
        </p>
      </div>
      <PredictionSchoolsClient schools={schools} />
    </div>
  );
}
