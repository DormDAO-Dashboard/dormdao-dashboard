import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isAdmin: false });
  }

  const email = user.email;
  const walletAddress = user.user_metadata?.wallet_address as string | undefined;

  if (!email && !walletAddress) {
    return NextResponse.json({ isAdmin: false });
  }

  const serviceClient = createServiceClient();

  // Build OR filter matching either the email or wallet address
  const filters: string[] = [];
  if (email) filters.push(`email.eq.${email}`);
  if (walletAddress) filters.push(`wallet_address.ilike.${walletAddress}`);

  const { data } = await serviceClient
    .from("admin_members")
    .select("id")
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ isAdmin: !!data });
}
