import { getSchoolsData } from "@/lib/cache";
import { SchoolsClient } from "@/components/SchoolsClient";

export default async function SchoolsPage() {
  const { schools } = await getSchoolsData();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Schools</h1>
        <p className="text-gray-400 mt-1">All {schools.length} DormDAO member universities</p>
      </div>
      <SchoolsClient initialSchools={schools} />
    </div>
  );
}
