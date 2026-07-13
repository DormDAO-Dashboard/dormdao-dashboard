import { createServiceClient } from "./supabase/server";

export async function logLoginAttempt(params: {
  email?: string;
  walletAddress?: string;
  reason: "not_registered" | "not_member";
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("login_attempts").insert({
      email: params.email ?? null,
      wallet_address: params.walletAddress ?? null,
      reason: params.reason,
    });
  } catch {
    // Non-blocking — never fail the auth flow due to logging
  }
}
