import { notFound } from "next/navigation";
import { requirePredictionsAccess } from "@/lib/predictions/access";
import { predictionSchoolName } from "@/lib/predictions/schools";
import { PredictionsNav } from "@/components/predictions/PredictionsNav";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";

// One school's prediction page — the Latest Pitch / Portfolio / Performance /
// Archive / Submit Pitch tabs. Only schools in PREDICTION_SCHOOLS have one.
export default async function PredictionSchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  await requirePredictionsAccess();
  const { slug } = await params;
  const name = predictionSchoolName(slug);
  if (!name) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <SchoolLogo name={name} size={36} />
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">{schoolDisplayName(name)}</h1>
          <p className="text-xs text-gray-700 dark:text-gray-400">Prediction Markets</p>
        </div>
      </div>
      <PredictionsNav slug={slug} />
      {children}
    </div>
  );
}
