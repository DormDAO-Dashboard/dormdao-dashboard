import { NextRequest, NextResponse } from "next/server";
import { readStore, sendMonthlyReports, incompleteMonths, periodKey, type SendResult } from "@/lib/monthly-report-sender";
import { previousMonthPeriod } from "@/lib/report-period";

export const maxDuration = 300;

// Each scheduled run sends at most this many emails, leaving the rest of
// Resend's 100/day free quota for the site's other emails (vote notices,
// trade alerts) that day.
const MAX_EMAILS_PER_RUN = 80;

// Vercel cron (vercel.json), twice a day (the 00:15 entry carries
// ?slot=resume only so the two schedules have distinct paths — the route
// does the same thing either way):
//   00:15 UTC — just after Resend's daily quota resets: finishes any
//               monthly send that stopped early (daily limit hit, or a
//               failure), whatever the date and whether or not auto-send
//               is on — someone already started that send.
//   15:00 UTC — the same, plus starting a new month's send when auto-send
//               is on and it's the 1st–3rd (the month that just ended;
//               the 2nd–3rd are retries). Never starts a late report when
//               auto-send is turned on mid-month.
// sendMonthlyReports skips anyone already sent, so reruns never duplicate.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const store = await readStore();
  const results: Record<string, SendResult["status"]> = {};
  let budget = MAX_EMAILS_PER_RUN;

  const run = async (trigger: "manual" | "auto", key: string) => {
    const before = countSent(store.months[key]);
    const result = await sendMonthlyReports(trigger, now, { key, maxEmails: budget });
    results[key] = result.status;
    budget -= countSent(result.log) - before;
    return result;
  };

  for (const key of incompleteMonths(store)) {
    if (budget <= 0) break;
    const result = await run(store.months[key].trigger, key);
    if (result.status === "paused" && result.log.paused?.reason === "quota") {
      return NextResponse.json({ results, stopped: "Resend daily limit" });
    }
  }

  const currentKey = periodKey(previousMonthPeriod(now));
  const startNew = store.autoSend && now.getUTCDate() <= 3 && now.getUTCHours() >= 14 && !store.months[currentKey];
  if (startNew && budget > 0) await run("auto", currentKey);

  return NextResponse.json({ results, emailsLeftInRun: budget });
}

function countSent(log: { sentTo?: Record<string, string[]> } | undefined): number {
  return Object.values(log?.sentTo ?? {}).reduce((n, list) => n + list.length, 0);
}
