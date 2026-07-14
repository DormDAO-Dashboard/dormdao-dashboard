import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSchoolsData } from "@/lib/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getSchoolColors } from "@/lib/schoolColors";
import { slugify } from "@/lib/utils";
import { SchoolLogo } from "@/components/SchoolLogo";
import { VotingClient } from "@/components/VotingClient";
import { schoolDisplayName } from "@/lib/schoolData";

async function VotingPageContent({ slug }: { slug: string }) {
  const { schools } = await getSchoolsData();
  const school = schools.find((s) => s.slug === slug) ?? null;
  if (!school) notFound();

  const colors = getSchoolColors(slug);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          🗳️
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Sign in to access {schoolDisplayName(school.name)} voting
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          Investment proposals and voting are available to verified {schoolDisplayName(school.name)} members.
        </p>
        <Link
          href="/login"
          style={{ backgroundColor: colors.primary, color: colors.text ?? "#fff" }}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </Link>
      </div>
    );
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("school")
    .eq("id", user.id)
    .single();

  const userSchoolSlug = profile?.school ? slugify(profile.school) : null;

  if (userSchoolSlug !== slug) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          🏫
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Members only
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 max-w-sm">
          This voting page is for {schoolDisplayName(school.name)} members only.
        </p>
        {userSchoolSlug && (
          <Link
            href={`/schools/${userSchoolSlug}/vote`}
            className="text-sm text-primary hover:underline"
          >
            Go to your school&apos;s voting page →
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <Link
        href={`/schools/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-white mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {schoolDisplayName(school.name)}
      </Link>

      <div className="h-1 w-full rounded-full mb-5" style={{ backgroundColor: colors.primary }} />

      <div className="flex items-center gap-4 mb-6">
        <SchoolLogo name={school.name} size={48} />
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: colors.primary }}>
            {schoolDisplayName(school.name)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Investment Voting</p>
        </div>
      </div>

      <VotingClient slug={slug} schoolName={school.name} pageMode />
    </>
  );
}

export default async function VotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div className="space-y-4 pt-4">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800 animate-pulse mb-6" />
          <div className="h-8 w-56 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
      }
    >
      <VotingPageContent slug={slug} />
    </Suspense>
  );
}
