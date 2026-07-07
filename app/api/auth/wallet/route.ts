import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminConfig, isAdminUser } from "@/lib/admin-config";
import { isRegisteredUser } from "@/lib/access-control";

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

  // Verify nonce is recent (within 10 minutes)
  const nonceTime = parseInt(nonce.split("-")[0], 10);
  if (isNaN(nonceTime) || Date.now() - nonceTime > 10 * 60 * 1000) {
    return NextResponse.json({ error: "Nonce expired — please try again." }, { status: 400 });
  }

  // Recover the signer address from the signature
  const message = `Sign in to DormDAO Dashboard\n\nNonce: ${nonce}`;
  let recoveredAddress: string;
  try {
    recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Signature address mismatch." }, { status: 400 });
  }

  // Gate: only registered admins/members may sign in
  const allowed = await isRegisteredUser(undefined, address);
  if (!allowed) {
    return NextResponse.json(
      { error: "Wallet not registered. Contact a DormDAO admin to get access." },
      { status: 403 },
    );
  }

  const supabase   = createServiceClient();
  const admin      = getAdminConfig();
  const adminMatch = isAdminUser(undefined, address);

  // Synthetic email used to anchor this wallet to a Supabase auth account
  const walletEmail = `wallet-${address.toLowerCase()}@wallet.dormdao.io`;

  // Attempt to create the Supabase user — ignore all errors (user may already exist,
  // or Supabase may reject for project-specific reasons). generateLink works for
  // both new and existing users so we proceed regardless.
  const { data: createdData } = await supabase.auth.admin.createUser({
    email: walletEmail,
    email_confirm: true,
    user_metadata: { wallet_address: address, login_method: "wallet" },
  });

  // For new admin wallet logins, seed the profile with the registered name
  const newUserId = createdData?.user?.id;
  if (adminMatch && newUserId) {
    await supabase.from("profiles").upsert(
      { id: newUserId, display_name: admin.name, school: null, bio: null, avatar_url: null },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }

  // Generate a magic-link token server-side — no email is sent
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: walletEmail,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: "Wallet is registered but session creation failed — please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ token_hash: linkData.properties.hashed_token });
}
