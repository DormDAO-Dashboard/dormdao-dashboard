"use client";
import { useEffect, useState } from "react";
import { Send, Loader2, AlertTriangle, CheckCircle2, AlertCircle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SendLog {
  startedAt: string;
  runningSince: string | null;
  portfolio: Record<string, number>;
  ramen: number | null;
  errors: Record<string, string>;
  skipped: string[];
  completedAt: string | null;
  paused?: { reason: "quota" | "cap"; at: string; resumesAt: string } | null;
  sentTo?: Record<string, string[]>;
}

interface Status {
  autoSend: boolean;
  key: string;
  log: SendLog | null;
  warnings: string[];
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Send button + auto-send switch for the monthly reports (see
// lib/monthly-report-sender.ts). The button covers the last completed
// month — the same month the previews below show.
export function MonthlyReportsSendPanel({ monthName, testSchool, testSchoolLabel }: {
  monthName: string;
  // School picked in the Monthly Portfolio Report preview row below — the
  // test sends that school's report.
  testSchool: string;
  testSchoolLabel: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/monthly-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, school: testSchool }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Test send failed (${res.status})`);
      setTestResult({ ok: true, message: `Test sent to ${json.sentTo}: ${json.schoolLabel}'s Portfolio Report and the Ramen Report, marked [TEST].` });
    } catch (err) {
      setTestResult({ ok: false, message: (err as Error).message });
    } finally {
      setTesting(false);
    }
  }

  async function load() {
    try {
      const res = await fetch("/api/admin/monthly-reports", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed to load (${res.status})`);
      setStatus(json as Status);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }

  useEffect(() => { load(); }, []);

  async function send() {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/admin/monthly-reports", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) throw new Error("A send is already in progress. Give it a few minutes, then refresh.");
      if (!res.ok) throw new Error(json.error ?? `Send failed (${res.status}). Refresh to see what went out, then retry — nobody is sent a report twice.`);
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
      setConfirming(false);
      await load();
    }
  }

  async function toggleAuto() {
    if (!status) return;
    setSavingToggle(true);
    try {
      const res = await fetch("/api/admin/monthly-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSend: !status.autoSend }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      setStatus({ ...status, autoSend: json.autoSend });
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setSavingToggle(false);
    }
  }

  const log = status?.log ?? null;
  const sent = !!log?.completedAt;
  const partial = !!log && !log.completedAt && !log.runningSince;
  const running = !!log?.runningSince;
  const portfolioCount = log ? Object.keys(log.portfolio).length : 0;
  const sentCount = log ? Object.values(log.sentTo ?? {}).reduce((n, l) => n + l.length, 0) : 0;
  // Errors from hitting the daily limit aren't failures — the daily
  // resume run finishes those.
  const errors = log ? Object.entries(log.errors).filter(([, msg]) => !/quota|daily.?limit/i.test(msg)) : [];

  return (
    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 space-y-4">
      {loadError && (
        <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {loadError}
        </div>
      )}

      {/* Send now */}
      <div>
        {sent ? (
          <div className="flex items-start gap-2 text-sm text-gray-900 dark:text-white">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{monthName} monthly reports sent</p>
              <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
                {fmt(log!.completedAt!)} · {portfolioCount} portfolio reports · Ramen Report to {log!.ramen} people
              </p>
            </div>
          </div>
        ) : !confirming ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={!status || sending || running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-[#fff] text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            {partial ? `Finish sending ${monthName} monthly reports` : `Send ${monthName} monthly reports`}
          </button>
        ) : (
          <div className="rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {partial ? `Send the rest of the ${monthName} reports?` : `Send the ${monthName} monthly reports now?`}
            </p>
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
              Each school&apos;s members get their Monthly Portfolio Report, and everyone on any school&apos;s email list gets the Ramen Report.
              Members who unsubscribed or alumni who haven&apos;t opted in are skipped; admins get a copy of every school&apos;s report. This can&apos;t be undone.
            </p>
            {status && status.warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {status.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={send}
                disabled={sending}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-[#fff] text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending — this can take a few minutes…</> : "Yes, send now"}
              </button>
              {!sending && (
                <button onClick={() => setConfirming(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {running && !sending && (
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-2">Sending is in progress (started {fmt(log!.startedAt)}). Refresh in a few minutes.</p>
        )}
        {partial && (
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-2">
            Partly sent: {portfolioCount} of the schools&apos; portfolio reports{log!.ramen != null ? " and the Ramen Report" : ""} have fully gone out ({sentCount} emails so far). Sending again only sends what&apos;s missing.
          </p>
        )}
        {partial && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-1">
            {log!.paused?.reason === "quota"
              ? "Paused: Resend's daily email limit was reached. "
              : log!.paused?.reason === "cap"
              ? "Paused for today, leaving room for the site's other emails. "
              : ""}
            The rest send automatically after Resend&apos;s limit resets each day
            {log!.paused ? `, next at ${fmt(log!.paused.resumesAt)}` : " (just after midnight UTC)"}, until everyone has theirs. You don&apos;t need to do anything.
          </p>
        )}
        {log && log.skipped.length > 0 && (
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-2">No month-end data, so no report for: {log.skipped.join(", ")}.</p>
        )}
        {errors.length > 0 && (
          <ul className="mt-2 space-y-1">
            {errors.map(([what, msg]) => (
              <li key={what} className="text-xs text-danger">{what}: {msg}</li>
            ))}
          </ul>
        )}
        {sendError && <p className="text-xs text-danger mt-2">{sendError}</p>}
      </div>

      {/* Test send */}
      <div>
        <button
          onClick={sendTest}
          disabled={testing || !testSchool}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 transition-colors"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
          {testing ? "Sending test…" : "Send a test to me"}
        </button>
        <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">
          Emails jack@dormdao.io {testSchoolLabel ? `${testSchoolLabel}'s` : "the selected school's"} Portfolio Report (pick the school below) and the Ramen Report, exactly as they&apos;d send. Doesn&apos;t count as sending {monthName}.
        </p>
        {testResult && (
          <p className={cn("text-xs mt-1", testResult.ok ? "text-primary" : "text-danger")}>{testResult.message}</p>
        )}
      </div>

      {/* Auto-send switch */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Automatically send monthly reports at the end of the month</p>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
            Sends each month&apos;s reports on the 1st of the next month, around 7–8am Pacific, once the month&apos;s final numbers are in. Months already sent are never re-sent.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={!!status?.autoSend}
          aria-label="Automatically send monthly reports"
          onClick={toggleAuto}
          disabled={!status || savingToggle}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
            status?.autoSend ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
          )}
        >
          <span className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            status?.autoSend ? "translate-x-5" : "translate-x-0.5"
          )} />
        </button>
      </div>
    </div>
  );
}
