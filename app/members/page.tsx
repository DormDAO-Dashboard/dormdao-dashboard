import { createServiceClient } from "@/lib/supabase/server";
import { MembersDirectory, type MemberProfile } from "@/components/MembersDirectory";

export const metadata = { title: "Members — DormDAO" };

interface RawProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  school: string | null;
  graduation_year: number | null;
  major: string | null;
  twitter: string | null;
  linkedin: string | null;
  telegram: string | null;
  public_fields: string[] | null;
}

function applyPublicFields(p: RawProfile): MemberProfile {
  const pf = Array.isArray(p.public_fields) ? p.public_fields : [];
  return {
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: pf.includes("bio") ? p.bio : null,
    school: pf.includes("school") ? p.school : null,
    graduation_year: pf.includes("graduation_year") ? p.graduation_year : null,
    major: pf.includes("major") ? p.major : null,
    twitter: pf.includes("twitter") ? p.twitter : null,
    linkedin: pf.includes("linkedin") ? p.linkedin : null,
    telegram: pf.includes("telegram") ? p.telegram : null,
  };
}

export default async function MembersPage() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, school, graduation_year, major, twitter, linkedin, telegram, public_fields, created_at")
    .eq("is_public", true)
    .not("display_name", "is", null)
    .order("created_at", { ascending: true });

  const members: MemberProfile[] = ((data as RawProfile[]) ?? []).map(applyPublicFields);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">DormDAO Members</h1>
        <p className="text-gray-500 mt-1 text-sm">Meet the people behind the portfolios</p>
      </div>
      <MembersDirectory members={members} />
    </div>
  );
}
