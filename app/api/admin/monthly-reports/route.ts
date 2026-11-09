import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-guard";
import { readStore, setAutoSend, sendMonthlyReports, sendTestReports, periodKey } from "@/lib/monthly-report-sender";
import { previousMonthPeriod } from "@/lib/report-period";
import { unapprovedCopyWarnings } from "@/lib/report-emails";

// Where "Send a test to me" goes.
const TEST_REPORT_EMAIL = "jack@dormdao.io";

// Sending all 18 reports takes longer than the default API route limit.
export const maxDuration = 300;

// GET   → auto-send setting + the send log for last month's reports
// PATCH { autoSend: boolean } → turn monthly auto-send on/off
// POST  → send last month's reports now (skips anything already sent)
// POST  { test: true, school: <slug> } → send just that school's report and
//        the Ramen Report to TEST_REPORT_EMAIL, marked [TEST]
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

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { test?: unknown; school?: unknown };
  if (body.test === true) {
    if (typeof body.school !== "string" || !body.school) {
      return NextResponse.json({ error: "school (slug) is required for a test send" }, { status: 400 });
    }
    try {
      // Always to TEST_REPORT_EMAIL, whoever clicks; greeted by and
      // unsubscribe-linked to the clicking admin's own profile.
      const { schoolLabel } = await sendTestReports({ email: TEST_REPORT_EMAIL, userId: admin.id }, body.school);
      return NextResponse.json({ sentTo: TEST_REPORT_EMAIL, schoolLabel });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  const result = await sendMonthlyReports("manual");
  return NextResponse.json(result, { status: result.status === "running" ? 409 : 200 });
}
