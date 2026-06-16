import { getSchoolsData } from "@/lib/cache";
import { SchoolsClient } from "@/components/SchoolsClient";

export default async function SchoolsPage() {
  const { schools } = await getSchoolsData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">School Portfolios</h1>
        <p className="text-gray-500 mt-1 text-sm">All {schools.length} DormDAO member universities</p>
      </div>
      <SchoolsClient initialSchools={schools} />
    </div>
  );
}
