import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminConfig, isAdminUser } from "@/lib/admin-config";
import { isRegisteredUser, getMemberForUser } from "@/lib/access-control";
import { logLoginAttempt } from "@/lib/login-attempts";

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

  const supabase = createServiceClient();

  // Claim the nonce — the primary key's uniqueness makes this atomic under
  // concurrent requests, so the exact same signed (address, signature,
  // nonce) payload can be redeemed exactly once, not just "within 10
  // minutes." Runs after signature verification (above) so an invalid
  // signature attempt never burns a nonce a legitimate retry would need.
  // Fails closed (not open) on any DB error, including the migration not
  // having been run yet — see supabase-wallet-nonce-migration.sql.
  const { error: nonceError } = await supabase.from("wallet_login_nonces").insert({ nonce });
  if (nonceError) {
    if (nonceError.code === "23505") {
      return NextResponse.json({ error: "This login request was already used — please try again." }, { status: 400 });
    }
    console.error("[wallet-auth] nonce claim failed:", nonceError.message);
    return NextResponse.json({ error: "Login temporarily unavailable — please try again." }, { status: 500 });
  }

  // Gate: only registered admins/members may sign in
  const allowed = await isRegisteredUser(undefined, address);
  if (!allowed) {
    await logLoginAttempt({ walletAddress: address, reason: "not_registered" });
    return NextResponse.json(
      { error: "Wallet not registered. Contact a DormDAO admin to get access." },
      { status: 403 },
    );
  }

  const admin      = getAdminConfig();
  const adminMatch = isAdminUser(undefined, address);

  // Look up the member record to get their pre-assigned school
  const member = adminMatch ? null : await getMemberForUser(undefined, address);

  // Anchor this wallet login to the member's real registered email (not a
  // synthetic wallet-only address) so signing in with Google or with this
  // wallet both resolve to the same Supabase auth user / profile. Every
  // registered member and the env-configured admin always has a real email
  // on file — isRegisteredUser already confirmed one of those two matched.
  const accountEmail = (member?.email ?? (adminMatch ? admin.email : undefined))?.toLowerCase();
  if (!accountEmail) {
    return NextResponse.json(
      { error: "Wallet is registered but no account email is on file — contact a DormDAO admin." },
      { status: 500 },
    );
  }

  // Attempt to create the Supabase user — ignore all errors (user may already exist,
  // e.g. from a prior Google sign-in, or Supabase may reject for project-specific
  // reasons). generateLink works for both new and existing users so we proceed regardless.
  const { data: createdData } = await supabase.auth.admin.createUser({
    email: accountEmail,
    email_confirm: true,
    user_metadata: { wallet_address: address, login_method: "wallet" },
  });

  // For new admin wallet logins, seed the profile with the registered name
  const newUserId = createdData?.user?.id;
  if (adminMatch && newUserId) {
    await supabase.from("profiles").upsert(
      { id: newUserId, display_name: admin.name, school: null, bio: null, avatar_url: null, wallet_address: address },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }

  // Generate a magic-link token server-side — no email is sent
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: accountEmail,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: "Wallet is registered but session creation failed — please try again." },
      { status: 500 },
    );
  }

  // Stamp the member's pre-assigned school, role, and wallet onto their profile.
  // Never downgrade a dorm_admin role that was set directly in the DB — mirrors
  // the same guard in app/auth/callback/route.ts for Google sign-in.
  const userId = newUserId ?? linkData.user?.id;
  if (member && userId) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    const preservedRole = existingProfile?.role === "dorm_admin" ? "dorm_admin" : (member.role ?? "member");

    await supabase
      .from("profiles")
      .upsert(
        { id: userId, school: member.school ?? null, role: preservedRole, wallet_address: address },
        { onConflict: "id" },
      );
  }

  const res = NextResponse.json({ token_hash: linkData.properties.hashed_token });
  if (member?.school && userId) {
    res.cookies.set("ddo-school-ok", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
