import { requireAdmin } from "@/lib/admin-guard";
import { VotingClient } from "@/components/VotingClient";
import { MAIN_DAO_SLUG, MAIN_DAO_NAME } from "@/lib/main-dao";

export const metadata = { title: "Main DAO — Admin — DormDAO" };

export default async function AdminMainDaoPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Main DAO</h1>
        <p className="text-gray-500 mt-1 text-sm">
          DormDAO-wide investment proposals. Proposals that pass at an individual school are
          automatically reposted here for a Main DAO vote.
        </p>
      </div>

      <VotingClient slug={MAIN_DAO_SLUG} schoolName={MAIN_DAO_NAME} pageMode isMainDao />
    </div>
  );
}
