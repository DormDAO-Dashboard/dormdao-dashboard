import { requirePredictionsAccess } from "@/lib/predictions/access";
import { PredictionsTopNav } from "@/components/predictions/PredictionsTopNav";

// OBG Prediction Markets — Oregon members (and admins) only; see lib/predictions/access.ts.
// Two top-level tabs: Leaderboard (/predictions) and Schools
// (/predictions/schools), with each school's own page under Schools.
export default async function PredictionsLayout({ children }: { children: React.ReactNode }) {
  await requirePredictionsAccess();
  return (
    <div>
      <PredictionsTopNav />
      {children}
    </div>
  );
}
