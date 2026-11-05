import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin-guard";
import { canUsePredictions } from "@/lib/predictions/eligibility";
import type { User } from "@supabase/supabase-js";

// OBG Prediction Markets is Oregon-only: current Oregon Blockchain Group
// members (profile school "Oregon", not marked alumni), plus DormDAO admins
// who run it. A profile's school is admin-assigned — the
// protect_profile_admin_fields trigger (supabase-rls-lockdown.sql) blocks
// members from changing it themselves — so it's safe to gate on.

// The signed-in user if they may use Predictions, else null. For API
// routes, which should answer 403 rather than redirect.
export async function getPredictionsUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (await getAdminUser()) return user;

  const { data: prof } = await createServiceClient()
    .from("profiles").select("school, is_alumni").eq("id", user.id).single();
  return canUsePredictions(prof?.school as string | null, prof?.is_alumni as boolean | null, false) ? user : null;
}

// Page gate for every /predictions page. Signed-out users go to /login,
// everyone else without access to /.
export async function requirePredictionsAccess(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await getPredictionsUser();
  if (!allowed) redirect("/");
  return allowed;
}
