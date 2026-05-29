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

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">
          {isSetup ? "Complete your profile" : "Your profile"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {isSetup
            ? "Tell the DormDAO community who you are before continuing."
            : "Update your display name, school affiliation, and bio."}
        </p>
      </div>

      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        avatarUrl={profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null}
        initialDisplayName={profile?.display_name ?? user.user_metadata?.full_name ?? ""}
        initialSchool={profile?.school ?? ""}
        initialBio={profile?.bio ?? ""}
        isSetup={isSetup}
      />
    </div>
  );
}
