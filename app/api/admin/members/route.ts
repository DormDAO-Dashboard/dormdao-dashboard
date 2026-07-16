import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getMembers, saveMembers, Member } from "@/lib/members-store";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)
    ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ members: await getMembers() });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const VALID_ROLES = ['member', 'club_admin', 'director', 'president'] as const;
  type MemberRole = typeof VALID_ROLES[number];

  const body = await req.json() as {
    members: Array<{ name: string; votingUnits: number; email: string; walletAddress: string; school?: string | null; role?: string }>;
  };

  if (!Array.isArray(body.members) || body.members.length === 0) {
    return NextResponse.json({ error: "No members provided" }, { status: 400 });
  }

  const existing = await getMembers();
  const added: Member[] = [];
  const errors: string[] = [];

  for (const m of body.members) {
    const name   = m.name?.trim();
    const email  = m.email?.trim().toLowerCase() ?? "";
    const wallet = m.walletAddress?.trim().toLowerCase() ?? "";
    const units  = Number.isFinite(m.votingUnits) ? m.votingUnits : 10;
    const school = m.school?.trim() || null;
    const role: MemberRole = VALID_ROLES.includes(m.role as MemberRole) ? (m.role as MemberRole) : 'member';

    if (!name) { errors.push("A row is missing a name — skipped."); continue; }
    if (!email && !wallet) { errors.push(`"${name}" needs at least an email or wallet address.`); continue; }

    const allMembers = [...existing, ...added];
    if (email  && allMembers.some(e => e.email.toLowerCase()         === email))  { errors.push(`${m.email} is already registered.`); continue; }
    if (wallet && allMembers.some(e => e.walletAddress.toLowerCase() === wallet)) { errors.push(`Wallet ${m.walletAddress.slice(0, 8)}… is already registered.`); continue; }

    added.push({
      id: crypto.randomUUID(),
      name,
      votingUnits: units,
      email: m.email?.trim() ?? "",
      walletAddress: m.walletAddress?.trim() ?? "",
      school,
      role,
      createdAt: new Date().toISOString(),
    });
  }

  if (added.length > 0) await saveMembers([...existing, ...added]);

  return NextResponse.json({ added: added.length, errors });
}
