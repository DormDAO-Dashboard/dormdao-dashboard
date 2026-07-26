import { requireAdmin } from "@/lib/admin-guard";
import { AdminEmailFunctionsSection } from "@/components/AdminEmailFunctionsSection";

export const metadata = { title: "Email Functions — Admin — DormDAO" };

export default async function AdminEmailFunctionsPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Email Functions</h1>
        <p className="text-gray-500 mt-1 text-sm">
          View and edit the copy in every automated email DormDAO sends.
        </p>
      </div>

      <AdminEmailFunctionsSection />
    </div>
  );
}
