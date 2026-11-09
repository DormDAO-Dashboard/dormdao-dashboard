import { NextRequest, NextResponse } from "next/server";
import { readStore, sendMonthlyReports } from "@/lib/monthly-report-sender";

export const maxDuration = 300;

// Vercel cron, daily at 15:00 UTC (vercel.json). Acts only when monthly
// auto-send is switched on, and only on the 1st–3rd of the month — the
// month that just ended — so turning auto-send on mid-month never fires off
// a late report. The 2nd and 3rd are retries: sendMonthlyReports skips
// anything already sent, so they only finish what a failed run left over.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  if (now.getUTCDate() > 3) return NextResponse.json({ skipped: "not the start of the month" });
  if (!(await readStore()).autoSend) return NextResponse.json({ skipped: "auto-send is off" });

  const result = await sendMonthlyReports("auto", now);
  return NextResponse.json({ status: result.status, key: result.key, errors: result.log.errors });
}
