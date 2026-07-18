import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import type { User } from "@supabase/supabase-js";

// Shared access gate for every /admin/* page: the env-configured admin, or
// any profile with role "dorm_admin". Redirects otherwise.
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = user.email;
  const wallet = user.user_metadata?.wallet_address as string | undefined;
  if (!isAdminUser(email, wallet)) {
    const service = createServiceClient();
    const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "dorm_admin") redirect("/");
  }

  return user;
}
