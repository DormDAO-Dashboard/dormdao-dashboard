import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { ProposalStatus } from "@/lib/proposals";

const VALID_STATUSES: ProposalStatus[] = ["passed", "rejected", "expired"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as { status?: string };
  const status = body.status as ProposalStatus;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status must be passed, rejected, or expired" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("proposals")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, status });
}
