import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ isAdmin: false });

  const email  = user.email;
  const wallet = user.user_metadata?.wallet_address as string | undefined;

  return NextResponse.json({ isAdmin: isAdminUser(email, wallet) });
}
