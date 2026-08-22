import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { canModerate } from "@/lib/auth-utils";
import { schoolNameFromSlug } from "@/lib/schoolData";

async function requireModerator(school: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };

  const service = createServiceClient();
  const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);
  if (!isAdmin) {
    const { data: profile } = await service.from("profiles").select("role, school").eq("id", user.id).single();
    if (!canModerate(profile ?? { role: null, school: null }, school)) {
      return { error: NextResponse.json({ error: "Only club leadership for this school can manage positions" }, { status: 403 }) };
    }
  }
  return { service };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const school = schoolNameFromSlug(slug);
  if (!school) return NextResponse.json({ error: "Unknown school" }, { status: 404 });

  const gate = await requireModerator(school);
  if (gate.error) return gate.error;
  const service = gate.service!;

  const body = await req.json() as {
    ticker?: string;
    blockchain?: string;
    tokens?: number;
    costBasisEth?: number;
    purchasePriceUsd?: number | null;
    investmentDate?: string;
  };

  const { data, error } = await service
    .from("positions")
    .update({
      ...(body.ticker !== undefined && { ticker: body.ticker.trim().toUpperCase() }),
      ...(body.blockchain !== undefined && { blockchain: body.blockchain.trim() }),
      ...(body.tokens !== undefined && { tokens: body.tokens }),
      ...(body.costBasisEth !== undefined && { cost_basis_eth: body.costBasisEth }),
      ...(body.purchasePriceUsd !== undefined && { purchase_price_usd: body.purchasePriceUsd }),
      ...(body.investmentDate !== undefined && { investment_date: body.investmentDate.trim() }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("school", school)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ position: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const school = schoolNameFromSlug(slug);
  if (!school) return NextResponse.json({ error: "Unknown school" }, { status: 404 });

  const gate = await requireModerator(school);
  if (gate.error) return gate.error;
  const service = gate.service!;

  const { error } = await service.from("positions").delete().eq("id", id).eq("school", school);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
