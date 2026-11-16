import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { isSameSchool } from "@/lib/auth-utils";

// Who can edit a school's profile (links and photo): DormDAO admins (env
// admins and dorm_admin), plus that school's own Directors and Presidents.
// A profile's school and role are admin-assigned — members can't change
// them themselves (protect_profile_admin_fields trigger).
const SCHOOL_EDITOR_ROLES = ["director", "president"];

export async function canEditSchoolProfile(schoolName: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return true;

  const { data: prof } = await createServiceClient()
    .from("profiles").select("role, school").eq("id", user.id).single();
  if (!prof) return false;
  if (prof.role === "dorm_admin") return true;
  return SCHOOL_EDITOR_ROLES.includes(prof.role ?? "") && isSameSchool(prof, schoolName);
}
