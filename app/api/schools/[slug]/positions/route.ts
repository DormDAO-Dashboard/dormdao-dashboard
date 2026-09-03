import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { canModerate } from "@/lib/auth-utils";
import { schoolNameFromSlug } from "@/lib/schoolData";
import { validatePositionFields } from "@/lib/position-validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const school = schoolNameFromSlug(slug);
  if (!school) return NextResponse.json({ error: "Unknown school" }, { status: 404 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("positions")
    .select("*")
    .eq("school", school)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ positions: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const school = schoolNameFromSlug(slug);
  if (!school) return NextResponse.json({ error: "Unknown school" }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const service = createServiceClient();
  const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);
  if (!isAdmin) {
    const { data: profile } = await service.from("profiles").select("role, school").eq("id", user.id).single();
    if (!canModerate(profile ?? { role: null, school: null }, school)) {
      return NextResponse.json({ error: "Only club leadership for this school can manage positions" }, { status: 403 });
    }
  }

  const body = await req.json() as {
    ticker?: string;
    blockchain?: string;
    tokens?: number;
    costBasisEth?: number;
    purchasePriceUsd?: number | null;
    investmentDate?: string;
  };

  if (!body.ticker?.trim()) return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  if (!body.investmentDate?.trim()) return NextResponse.json({ error: "investmentDate is required" }, { status: 400 });
  const validationError = validatePositionFields(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { data, error } = await service
    .from("positions")
    .insert({
      school,
      ticker: body.ticker.trim().toUpperCase(),
      blockchain: body.blockchain?.trim() ?? "",
      tokens: body.tokens ?? 0,
      cost_basis_eth: body.costBasisEth ?? 0,
      purchase_price_usd: body.purchasePriceUsd ?? null,
      investment_date: body.investmentDate.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ position: data }, { status: 201 });
}
