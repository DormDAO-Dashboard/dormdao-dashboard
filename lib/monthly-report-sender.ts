import { createServiceClient } from "@/lib/supabase/server";
import { getSchoolRecipients, sendToRecipients, type Recipient } from "@/lib/email";
import { buildPortfolioReportEmail, buildLeaderboardDigestEmail, personalizeReport } from "@/lib/report-emails";
import { previousMonthPeriod, getClosingState, type ReportPeriod } from "@/lib/report-period";
import { SCHOOL_NAMES, schoolDisplayName } from "@/lib/schoolData";
import { slugify } from "@/lib/utils";

// Sends the monthly reports for the last completed month: one Monthly
// Portfolio Report per school (to that school's members, plus the usual
// admin copies — the same recipients and opt-outs as every other school
// email, via getSchoolRecipients) and one Ramen Report to everyone on any
// school's list, deduplicated.
//
// Triggered by the admin "Send" button or, when auto-send is on, by the
// monthly cron (app/api/cron/monthly-reports). Every piece that goes out is
// logged as soon as it's sent, so a run that's interrupted or partly fails
// can be re-run and only sends what's still missing — nobody gets a
// report twice.

const BUCKET = "admin-data";
const FILE = "monthly-reports.json";

export interface MonthSendLog {
  startedAt: string;
  trigger: "manual" | "auto";
  // Set while a run is going, to refuse a second concurrent one.
  runningSince: string | null;
  // school name → number of recipients it went to, once fully sent.
  portfolio: Record<string, number>;
  ramen: number | null;
  // report ("Oregon", "Ramen Report") → addresses already sent to, saved
  // after every chunk so a retry never re-sends to them.
  sentTo: Record<string, string[]>;
  // school name (or "Ramen Report") → last error, cleared once it sends.
  errors: Record<string, string>;
  // Schools with no month-end data, so no report was built for them.
  skipped: string[];
  completedAt: string | null;
}

export interface MonthlyReportsStore {
  autoSend: boolean;
  // "2026-10" → log
  months: Record<string, MonthSendLog>;
}

function storage() {
  return createServiceClient().storage.from(BUCKET);
}

export async function readStore(): Promise<MonthlyReportsStore> {
  try {
    const { data, error } = await storage().download(FILE);
    if (!error && data) {
      const parsed = JSON.parse(await data.text()) as Partial<MonthlyReportsStore>;
      return { autoSend: parsed.autoSend === true, months: parsed.months ?? {} };
    }
  } catch {
    // Missing file/bucket: nothing saved yet.
  }
  return { autoSend: false, months: {} };
}

async function writeStore(store: MonthlyReportsStore): Promise<void> {
  const supabase = createServiceClient();
  const { error: bucketError } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (bucketError && !bucketError.message.toLowerCase().includes("already")) {
    console.error("[monthly-reports] bucket:", bucketError.message);
  }
  const { error } = await supabase.storage.from(BUCKET).upload(FILE, JSON.stringify(store, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(`Couldn't save monthly report log: ${error.message}`);
}

export async function setAutoSend(autoSend: boolean): Promise<MonthlyReportsStore> {
  const store = await readStore();
  store.autoSend = autoSend;
  await writeStore(store);
  return store;
}

export function periodKey(period: ReportPeriod): string {
  return period.monthStart.toISOString().slice(0, 7);
}

// A run that hasn't touched its log in this long is assumed dead (the
// function timed out) and may be resumed.
const STALE_RUN_MS = 6 * 60_000;

export type SendResult =
  | { status: "sent" | "partial"; key: string; log: MonthSendLog }
  | { status: "already_sent" | "running"; key: string; log: MonthSendLog };

async function displayNames(userIds: string[]): Promise<Map<string, string | null>> {
  const names = new Map<string, string | null>();
  for (let i = 0; i < userIds.length; i += 200) {
    const { data } = await createServiceClient()
      .from("profiles").select("id, display_name").in("id", userIds.slice(i, i + 200));
    for (const p of data ?? []) names.set(p.id as string, (p.display_name as string | null) ?? null);
  }
  return names;
}

// Resend allows ~2 requests/s; leave a gap between sends.
const pause = () => new Promise((r) => setTimeout(r, 600));

export async function sendMonthlyReports(trigger: "manual" | "auto", now: Date = new Date()): Promise<SendResult> {
  const period = previousMonthPeriod(now);
  const key = periodKey(period);
  const store = await readStore();
  const existing = store.months[key];

  if (existing?.completedAt) return { status: "already_sent", key, log: existing };
  if (existing?.runningSince && now.getTime() - new Date(existing.runningSince).getTime() < STALE_RUN_MS) {
    return { status: "running", key, log: existing };
  }

  const log: MonthSendLog = existing ?? {
    startedAt: now.toISOString(), trigger, runningSince: null, portfolio: {}, ramen: null, sentTo: {}, errors: {}, skipped: [], completedAt: null,
  };
  log.sentTo ??= {};
  log.runningSince = new Date().toISOString();
  store.months[key] = log;
  await writeStore(store);

  const save = async () => {
    log.runningSince = new Date().toISOString();
    store.months[key] = log;
    await writeStore(store);
  };

  // Sends one report in chunks of 50, skipping anyone already sent this
  // report and recording each chunk as soon as it's accepted.
  const sendReport = async (piece: string, recipients: Recipient[], build: (r: Recipient) => { subject: string; html: string }) => {
    const done = new Set(log.sentTo[piece] ?? []);
    const todo = recipients.filter((r) => !done.has(r.email));
    for (let i = 0; i < todo.length; i += 50) {
      const chunk = todo.slice(i, i + 50);
      await sendToRecipients(chunk, build);
      log.sentTo[piece] = [...(log.sentTo[piece] ?? []), ...chunk.map((r) => r.email)];
      await save();
      await pause();
    }
    return recipients.length;
  };

  try {
    const state = await getClosingState(period);
    log.skipped = state.missing;

    const recipientsBySchool = new Map<string, Recipient[]>();
    for (const name of SCHOOL_NAMES) recipientsBySchool.set(name, await getSchoolRecipients(slugify(name)));
    const everyone = new Map<string, Recipient>();
    for (const list of recipientsBySchool.values()) for (const r of list) if (!everyone.has(r.email)) everyone.set(r.email, r);
    const names = await displayNames([...new Set([...everyone.values()].map((r) => r.userId))]);

    // ── One portfolio report per school
    for (const school of state.schools) {
      if (log.portfolio[school.name] != null) continue;
      const label = schoolDisplayName(school.name);
      try {
        const email = await buildPortfolioReportEmail(slugify(school.name), now, { state, forSend: true });
        if (!email) throw new Error("No month-end data for this school.");
        log.portfolio[school.name] = await sendReport(school.name, recipientsBySchool.get(school.name) ?? [], (r) => ({
          subject: email.subject,
          html: personalizeReport(email.html, names.get(r.userId), r.userId),
        }));
        delete log.errors[label];
      } catch (err) {
        log.errors[label] = (err as Error).message;
      }
      await save();
    }

    // ── Ramen Report to everyone
    if (log.ramen == null) {
      try {
        const email = await buildLeaderboardDigestEmail(now, { state, forSend: true });
        log.ramen = await sendReport("Ramen Report", [...everyone.values()], (r) => ({
          subject: email.subject,
          html: personalizeReport(email.html, names.get(r.userId), r.userId),
        }));
        delete log.errors["Ramen Report"];
      } catch (err) {
        log.errors["Ramen Report"] = (err as Error).message;
      }
    }

    const allSent = state.schools.every((s) => log.portfolio[s.name] != null) && log.ramen != null;
    if (allSent) log.completedAt = new Date().toISOString();
    log.runningSince = null;
    store.months[key] = log;
    await writeStore(store);
    return { status: allSent ? "sent" : "partial", key, log };
  } catch (err) {
    log.errors.Run = (err as Error).message;
    log.runningSince = null;
    store.months[key] = log;
    await writeStore(store).catch(() => {});
    return { status: "partial", key, log };
  }
}
