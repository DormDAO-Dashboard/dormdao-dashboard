import { requireAdmin } from "@/lib/admin-guard";
import { getRepo } from "@/lib/predictions/repo";
import { SubmitPitchForm } from "@/components/predictions/SubmitPitchForm";

export default async function SubmitPitchPage() {
  // Gate in the page itself, not only the layout: Next renders layouts and
  // pages in parallel, so a layout-only check still streams page data.
  await requireAdmin();
  const rounds = await getRepo().listRounds();
  const nextRound = (rounds[0]?.number ?? 0) + 1;
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Submit a Pitch</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Same fields as the thesis template: market, investment, price, implied price, sell limit, stop, and thesis.
      </p>
      <SubmitPitchForm nextRound={nextRound} />
    </div>
  );
}
