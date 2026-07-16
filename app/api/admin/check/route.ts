import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ isAdmin: false });

  const email  = user.email;
  const wallet = user.user_metadata?.wallet_address as string | undefined;

  if (isAdminUser(email, wallet)) return NextResponse.json({ isAdmin: true });

  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return NextResponse.json({ isAdmin: prof?.role === "dorm_admin" });
}
