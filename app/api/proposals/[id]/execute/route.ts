import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { canModerate } from "@/lib/auth-utils";
import { sendExecutionEmail } from "@/lib/email";
import type { Proposal } from "@/lib/proposals";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await params;
  const service = createServiceClient();

  const { data: proposal } = await service
    .from("proposals")
    .select("school, status")
    .eq("id", id)
    .single();

  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  if (proposal.status !== "passed") {
    return NextResponse.json({ error: "Only passed proposals can be marked as executed" }, { status: 400 });
  }

  const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);
  if (!isAdmin) {
    const { data: profile } = await service
      .from("profiles")
      .select("role, school")
      .eq("id", user.id)
      .single();

    if (!canModerate(profile ?? { role: null, school: null }, proposal.school)) {
      return NextResponse.json({ error: "Only club leadership can mark proposals as executed" }, { status: 403 });
    }
  }

  const body = await req.json() as {
    execution_tx?: string;
    execution_notes?: string;
    trade_output?: string;
  };

  if (!body.execution_tx?.trim()) {
    return NextResponse.json({ error: "execution_tx (Etherscan link) is required" }, { status: 400 });
  }
  if (!body.trade_output?.trim()) {
    return NextResponse.json({ error: "trade_output is required" }, { status: 400 });
  }

  const notes = [body.trade_output?.trim(), body.execution_notes?.trim()].filter(Boolean).join("\n\n");

  const { data: updated, error } = await service
    .from("proposals")
    .update({
      status: "executed",
      execution_tx: body.execution_tx.trim(),
      execution_notes: notes || null,
      executed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  after(async () => {
    await sendExecutionEmail(updated as Proposal).catch(console.error);
  });

  return NextResponse.json({ proposal: updated });
}
