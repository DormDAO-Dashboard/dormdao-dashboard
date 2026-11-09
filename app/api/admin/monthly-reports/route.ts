import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-guard";
import { readStore, setAutoSend, sendMonthlyReports, periodKey } from "@/lib/monthly-report-sender";
import { previousMonthPeriod } from "@/lib/report-period";
import { unapprovedCopyWarnings } from "@/lib/report-emails";

// Sending all 18 reports takes longer than the default API route limit.
export const maxDuration = 300;

// GET   → auto-send setting + the send log for last month's reports
// PATCH { autoSend: boolean } → turn monthly auto-send on/off
// POST  → send last month's reports now (skips anything already sent)
export async function GET() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await readStore();
  const key = periodKey(previousMonthPeriod());
  return NextResponse.json({ autoSend: store.autoSend, key, log: store.months[key] ?? null, warnings: unapprovedCopyWarnings() });
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { autoSend?: unknown };
  if (typeof body.autoSend !== "boolean") {
    return NextResponse.json({ error: "autoSend (boolean) is required" }, { status: 400 });
  }
  const store = await setAutoSend(body.autoSend);
  return NextResponse.json({ autoSend: store.autoSend });
}

export async function POST() {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await sendMonthlyReports("manual");
  return NextResponse.json(result, { status: result.status === "running" ? 409 : 200 });
}
