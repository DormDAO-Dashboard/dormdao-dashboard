import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import type { User } from "@supabase/supabase-js";

// The signed-in user if they're an admin — the env-configured admin, or any
// profile with role "dorm_admin" — else null. For API routes, which should
// answer 403 rather than redirect.
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const email = user.email;
  const wallet = user.user_metadata?.wallet_address as string | undefined;
  if (isAdminUser(email, wallet)) return user;

  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return prof?.role === "dorm_admin" ? user : null;
}

// Shared access gate for every /admin/* page (and /predictions while it's
// admin-only). Redirects signed-out users to /login and non-admins to /.
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = await getAdminUser();
  if (!admin) redirect("/");
  return admin;
}
