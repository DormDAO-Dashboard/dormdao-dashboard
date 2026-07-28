import { VotingClient } from "@/components/VotingClient";
import { MAIN_DAO_SLUG, MAIN_DAO_NAME } from "@/lib/main-dao";

export const metadata = { title: "Main DAO — DormDAO" };

export default function MainDaoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Main DAO</h1>
        <p className="text-gray-700 dark:text-gray-400 mt-1 text-sm">
          DormDAO-wide investment proposals, voted on by DormDAO admins and Main DAO voters.
        </p>
      </div>

      <VotingClient slug={MAIN_DAO_SLUG} schoolName={MAIN_DAO_NAME} pageMode isMainDao />
    </div>
  );
}
