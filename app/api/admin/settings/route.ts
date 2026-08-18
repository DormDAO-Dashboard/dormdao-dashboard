import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { isDataCollectionPaused, setDataCollectionPaused } from "@/lib/data-collection-store";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return user;
  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return prof?.role === "dorm_admin" ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ dataCollectionPaused: await isDataCollectionPaused() });
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { dataCollectionPaused?: boolean };
  if (typeof body.dataCollectionPaused !== "boolean") {
    return NextResponse.json({ error: "dataCollectionPaused (boolean) is required" }, { status: 400 });
  }

  await setDataCollectionPaused(body.dataCollectionPaused);
  return NextResponse.json({ dataCollectionPaused: body.dataCollectionPaused });
}
