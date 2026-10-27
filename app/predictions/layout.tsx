import { requireAdmin } from "@/lib/admin-guard";
import { PredictionsNav } from "@/components/predictions/PredictionsNav";

// OBG Prediction Markets — admin-only while it's being built out.
export default async function PredictionsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <PredictionsNav />
      {children}
    </div>
  );
}
