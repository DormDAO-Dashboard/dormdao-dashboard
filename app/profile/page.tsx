import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { setup } = await searchParams;
  const isSetup = setup === "1";

  const p = profile as {
    avatar_url?: string | null;
    display_name?: string | null;
    school?: string | null;
    bio?: string | null;
    graduation_year?: number | null;
    major?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
    telegram?: string | null;
    discord?: string | null;
    wallet_address?: string | null;
    is_public?: boolean | null;
    public_fields?: string[] | null;
    vote_reminder_emails?: boolean | null;
    is_alumni?: boolean | null;
    alumni_email_optin?: boolean | null;
  } | null;

  const sharedProps = {
    userId: user.id,
    email: user.email ?? "",
    avatarUrl: p?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
    initialDisplayName: p?.display_name ?? (user.user_metadata?.full_name as string | undefined) ?? "",
    initialSchool: p?.school ?? "",
    initialBio: p?.bio ?? "",
    initialGraduationYear: p?.graduation_year ?? null,
    initialMajor: p?.major ?? "",
    initialTwitter: p?.twitter ?? "",
    initialLinkedin: p?.linkedin ?? "",
    initialTelegram: p?.telegram ?? "",
    initialDiscord: p?.discord ?? "",
    initialWalletAddress: p?.wallet_address ?? "",
    initialIsPublic: p?.is_public ?? false,
    initialPublicFields: Array.isArray(p?.public_fields) ? (p.public_fields as string[]) : [],
    initialVoteReminderEmails: p?.vote_reminder_emails ?? true,
    initialIsAlumni: p?.is_alumni ?? false,
    initialAlumniEmailOptin: p?.alumni_email_optin ?? false,
  };

  if (isSetup) {
    return <ProfileForm {...sharedProps} isSetup />;
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Your profile</h1>
        <p className="text-gray-500 mt-1 text-sm">Update your display name, school, avatar, and privacy settings.</p>
      </div>
      <ProfileForm {...sharedProps} isSetup={false} />
    </div>
  );
}
