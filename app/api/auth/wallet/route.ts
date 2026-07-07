import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminConfig, isAdminUser } from "@/lib/admin-config";

export async function POST(request: NextRequest) {
  let body: { address?: string; signature?: string; nonce?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { address, signature, nonce } = body;

  if (!address || !signature || !nonce) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify nonce timestamp is recent (within 10 minutes)
  const nonceTime = parseInt(nonce.split("-")[0], 10);
  if (isNaN(nonceTime) || Date.now() - nonceTime > 10 * 60 * 1000) {
    return NextResponse.json({ error: "Nonce expired or invalid" }, { status: 400 });
  }

  // Verify the signature recovers to the claimed address
  const message = `Sign in to DormDAO Dashboard\n\nNonce: ${nonce}`;
  let recoveredAddress: string;
  try {
    recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Signature address mismatch" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const admin    = getAdminConfig();
  const adminMatch = isAdminUser(undefined, address);

  // Synthetic email for the Supabase auth account tied to this wallet
  const walletEmail = `wallet-${address.toLowerCase()}@wallet.dormdao.io`;

  // Create user if they don't exist
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: walletEmail,
    email_confirm: true,
    user_metadata: { wallet_address: address, login_method: "wallet" },
  });

  if (createError && !createError.message.toLowerCase().includes("already registered")) {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  // For admin wallets, auto-populate their profile with the registered admin name
  // so the profile page shows their real name instead of a wallet address.
  const userId = created?.user?.id;
  if (adminMatch && userId) {
    await supabase.from("profiles").upsert({
      id: userId,
      display_name: admin.name,
      school: null,
      bio: null,
      avatar_url: null,
    }, { onConflict: "id", ignoreDuplicates: true });
  }

  // Generate a magic-link token server-side — no email is sent
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: walletEmail,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: "Failed to create session token" }, { status: 500 });
  }

  return NextResponse.json({ token_hash: linkData.properties.hashed_token });
}
