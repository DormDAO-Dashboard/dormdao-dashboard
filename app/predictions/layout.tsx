import { requirePredictionsAccess } from "@/lib/predictions/access";
import { PredictionsNav } from "@/components/predictions/PredictionsNav";

// OBG Prediction Markets — Oregon members (and admins) only; see lib/predictions/access.ts.
export default async function PredictionsLayout({ children }: { children: React.ReactNode }) {
  await requirePredictionsAccess();
  return (
    <div>
      <PredictionsNav />
      {children}
    </div>
  );
}
