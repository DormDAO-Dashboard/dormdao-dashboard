import { requireAdmin } from "@/lib/admin-guard";
import { isDataCollectionPaused } from "@/lib/data-collection-store";
import { AdminSettingsSection } from "@/components/AdminSettingsSection";

export const metadata = { title: "Admin Settings — Admin — DormDAO" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const paused = await isDataCollectionPaused();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Settings</h1>
        <p className="text-gray-700 dark:text-gray-400 mt-1 text-sm">
          Site-wide settings and kill switches.
        </p>
      </div>

      <AdminSettingsSection initialPaused={paused} />
    </div>
  );
}
