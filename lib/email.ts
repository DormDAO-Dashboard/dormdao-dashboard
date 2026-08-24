import { createHmac } from "crypto";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import type { PushPayload } from "@/lib/push";
import type { Proposal } from "@/lib/proposals";
import { SCHOOL_NAMES, schoolDisplayName } from "@/lib/schoolData";
import { slugify } from "@/lib/utils";
import { MAIN_DAO_SLUG, MAIN_DAO_NAME } from "@/lib/main-dao";
import { getAdminEmails } from "@/lib/admin-config";
import { fillTemplate } from "@/lib/email-templates";
import { getEffectiveTemplateFields } from "@/lib/email-templates-store";

// dormdao.io is verified in Resend — sending from the shared onboarding@resend.dev
// sandbox address only works when the recipient is the Resend account's own email.
export const FROM_ADDRESS = "onboarding@dormdao.io";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dormdao-dashboard.vercel.app";

// Escapes user-controlled strings before they're interpolated into email HTML.
// Every proposal title/description, display name, and signup-form field that
// reaches an email template is attacker-influenced (proposal fields by any
// club member, signup fields by anyone — that endpoint requires no auth).
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Unsubscribe token (HMAC-SHA256 keyed with CRON_SECRET) ───────────────────

function makeUnsubToken(userId: string): string {
  const secret = process.env.CRON_SECRET ?? "dormDAO-unsub-fallback";
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export function buildUnsubUrl(userId: string): string {
  return `${APP_URL}/api/unsubscribe?uid=${encodeURIComponent(userId)}&token=${makeUnsubToken(userId)}`;
}

export function verifyUnsubToken(userId: string, token: string): boolean {
  const expected = makeUnsubToken(userId);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

// ── Base HTML template ────────────────────────────────────────────────────────

function buildTemplate(opts: {
  title: string;
  schoolLabel?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  userId?: string;
}): string {
  const schoolBadge = opts.schoolLabel
    ? `<p style="font-size:11px;color:#6b7280;margin:0 0 10px;text-transform:uppercase;letter-spacing:.07em">${opts.schoolLabel}</p>`
    : "";
  const ctaBtn = opts.cta
    ? `<p style="margin-top:20px"><a href="${opts.cta.url}" style="display:inline-block;padding:10px 22px;background:#1D9E75;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">${opts.cta.label}</a></p>`
    : "";
  const footerLink = opts.userId
    ? `<a href="${buildUnsubUrl(opts.userId)}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>`
    : `<a href="${APP_URL}/profile" style="color:#9ca3af;text-decoration:underline">Manage preferences</a>`;

  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
  <div style="background:#111827;padding:18px 24px;border-radius:12px 12px 0 0">
    <span style="font-size:16px;font-weight:700;color:#fff">DormDAO</span>
  </div>
  <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
    ${schoolBadge}
    <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 14px">${opts.title}</h2>
    ${opts.bodyHtml}
    ${ctaBtn}
  </div>
  <div style="background:#f9fafb;padding:14px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;font-size:11px;color:#9ca3af">
    You received this from DormDAO &middot; ${footerLink}
  </div>
</div>`;
}

// ── Admin-editable template fields ────────────────────────────────────────────
// Fills an admin-authored subject/heading template with pre-escaped variable
// values. The raw template text itself is escaped first (so a stray "&"/"<"
// typed by an admin can't break the surrounding HTML) — {{tokens}} survive
// escaping untouched and are substituted afterward.
function renderField(raw: string, vars: Record<string, string>): string {
  return fillTemplate(escapeHtml(raw), vars);
}

// Same as renderField, but splits on blank lines into <p> paragraphs for the
// free-text "message" fields, which may be blank (nothing rendered).
function renderMessageHtml(raw: string, vars: Record<string, string>): string {
  const filled = renderField(raw, vars);
  if (!filled.trim()) return "";
  return filled
    .split(/\n{2,}/)
    .map((p, i) => `<p style="font-size:14px;color:#374151;line-height:1.6;${i > 0 ? "margin-top:10px" : ""}">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// ── School recipient resolution ───────────────────────────────────────────────

interface Recipient {
  email: string;
  userId: string;
}

type ProfileRow = {
  id: string;
  vote_reminder_emails?: boolean | null;
  is_alumni?: boolean | null;
  alumni_email_optin?: boolean | null;
};

// Proposal display label / vote URL, aware of the synthetic Main DAO "school".
export function proposalSchoolLabel(schoolSlug: string): string {
  if (schoolSlug === MAIN_DAO_SLUG) return MAIN_DAO_NAME;
  const schoolName = (SCHOOL_NAMES as readonly string[]).find((n) => slugify(n) === schoolSlug);
  return schoolName ? schoolDisplayName(schoolName) : schoolSlug;
}

export function proposalVoteUrl(schoolSlug: string): string {
  return schoolSlug === MAIN_DAO_SLUG
    ? `${APP_URL}/admin/main-dao`
    : `${APP_URL}/schools/${schoolSlug}/vote`;
}

export async function getSchoolRecipients(schoolSlug: string): Promise<Recipient[]> {
  // Main DAO has no "school members" — only DormDAO admins are notified.
  const isMainDao = schoolSlug === MAIN_DAO_SLUG;
  const schoolName = isMainDao
    ? undefined
    : (SCHOOL_NAMES as readonly string[]).find((n) => slugify(n) === schoolSlug);
  if (!isMainDao && !schoolName) return [];

  const service = createServiceClient();

  const [{ data: memberRows }, { data: adminRows }] = await Promise.all([
    isMainDao
      ? Promise.resolve({ data: [] as ProfileRow[] })
      : service
          .from("profiles")
          .select("id, vote_reminder_emails, is_alumni, alumni_email_optin")
          .eq("school", schoolName as string),
    service
      .from("profiles")
      .select("id, vote_reminder_emails")
      .eq("role", "dorm_admin"),
  ]);

  const seen = new Set<string>();
  const candidateIds: string[] = [];

  for (const raw of memberRows ?? []) {
    const p = raw as ProfileRow;
    if (seen.has(p.id)) continue;
    const isAlumni = p.is_alumni === true;
    // Alumni only get emails if explicitly opted in; active members default to opted in
    const wantsEmails = isAlumni ? p.alumni_email_optin === true : p.vote_reminder_emails !== false;
    if (!wantsEmails) continue;
    seen.add(p.id);
    candidateIds.push(p.id);
  }

  // dorm_admins receive one copy of every school email (deduplicated by email below)
  for (const raw of adminRows ?? []) {
    const p = raw as ProfileRow;
    if (seen.has(p.id) || p.vote_reminder_emails === false) continue;
    seen.add(p.id);
    candidateIds.push(p.id);
  }

  // listUsers is needed even when candidateIds is empty, to resolve the
  // env-configured admin(s) below (ADMIN_EMAIL/ADMIN_EMAILS) — those admins
  // aren't necessarily reflected as a profiles.role = 'dorm_admin' row (that
  // role can't even be granted through the admin members UI), so relying on
  // the dorm_admin query alone would silently skip them.
  const { data: { users } } = await service.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(users.map((u) => [u.id, u.email ?? null]));

  const emailSeen = new Set<string>();
  const recipients: Recipient[] = [];
  for (const id of candidateIds) {
    const email = emailById.get(id);
    // Skip wallet auth virtual addresses
    if (!email || email.endsWith("@wallet.dormdao.io") || emailSeen.has(email)) continue;
    emailSeen.add(email);
    recipients.push({ email, userId: id });
  }

  for (const adminEmail of getAdminEmails()) {
    if (emailSeen.has(adminEmail)) continue;
    const matched = users.find((u) => u.email?.toLowerCase() === adminEmail);
    if (!matched?.email) continue; // no real auth account yet — nowhere to send/attach an unsubscribe token
    emailSeen.add(adminEmail);
    recipients.push({ email: matched.email, userId: matched.id });
  }

  return recipients;
}

// ── Resend response checking ──────────────────────────────────────────────────
// The Resend SDK does NOT throw on API-level rejections (invalid recipient,
// unverified domain, sandbox restrictions, etc.) — it resolves with
// { data: null, error: {...} } instead. Every call site must check this, or a
// rejected send is indistinguishable from a successful one and fails silently.
function assertResendOk(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(`Resend: ${result.error.message}`);
}

// ── Batch send helper ─────────────────────────────────────────────────────────

async function batchSend(
  recipients: Recipient[],
  buildEmail: (r: Recipient) => { subject: string; html: string },
): Promise<void> {
  if (!recipients.length) return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const resend = new Resend(apiKey);
  for (let i = 0; i < recipients.length; i += 50) {
    const slice = recipients.slice(i, i + 50);
    const result = await resend.batch.send(
      slice.map((r) => {
        const { subject, html } = buildEmail(r);
        return { from: FROM_ADDRESS, to: r.email, subject, html };
      }),
    );
    assertResendOk(result);
  }
}

// ── Generic push-triggered blast (existing, preserved) ───────────────────────

export async function sendEmailNotifications(payload: PushPayload): Promise<void> {
  const service = createServiceClient();
  const { data: profiles } = await service
    .from("profiles")
    .select("id")
    .eq("email_notifications", true);

  if (!profiles?.length) return;

  // Batch-resolve emails via one listUsers call instead of one getUserById
  // per profile — same pattern as getSchoolRecipients below.
  const optedInIds = new Set(profiles.map((p) => p.id));
  const { data: { users } } = await service.auth.admin.listUsers({ perPage: 1000 });
  const emails = users
    .filter((u) => optedInIds.has(u.id) && u.email)
    .map((u) => u.email as string);
  if (!emails.length) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: emails,
    subject: payload.title,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <p style="font-size:15px;color:#111">${payload.body}</p>
      <a href="${payload.url}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#1D9E75;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View on DormDAO →</a>
      <p style="margin-top:24px;font-size:11px;color:#999">You're receiving this because you enabled email alerts on DormDAO.</p>
    </div>`,
  });
  assertResendOk(result);
}

// ── School-scoped emails ──────────────────────────────────────────────────────

export async function sendInviteEmail(opts: {
  to: string;
  name: string;
  school: string;
  invitedBy?: string;
  walletAddress?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const resend = new Resend(apiKey);
  const schoolLabel = schoolDisplayName(opts.school);
  const walletLast4 = opts.walletAddress ? opts.walletAddress.slice(-4) : null;
  const vars = { name: escapeHtml(opts.name), school: schoolLabel, walletLast4: walletLast4 ? escapeHtml(walletLast4) : "" };
  const t = await getEffectiveTemplateFields("onboarding_invite");

  const invitedLine = opts.invitedBy
    ? `<p style="font-size:14px;color:#374151;line-height:1.6"><strong>${escapeHtml(opts.invitedBy)}</strong> invited you to join DormDAO.</p>`
    : "";

  // Only rendered when the member actually has a wallet on file — otherwise
  // the {{walletLast4}} token would leave a broken-looking "ending in ." line.
  const walletLine = walletLast4 ? renderMessageHtml(t.walletLine, vars) : "";

  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    subject: fillTemplate(t.subject, vars),
    html: buildTemplate({
      title: renderField(t.heading, vars),
      schoolLabel,
      bodyHtml: invitedLine + renderMessageHtml(t.message, vars) + walletLine,
      cta: { label: "Join DormDAO →", url: `${APP_URL}/login` },
    }),
  });
  assertResendOk(result);
}

export async function sendNewProposalEmail(proposal: Proposal): Promise<void> {
  const recipients = await getSchoolRecipients(proposal.school);
  const schoolLabel = proposalSchoolLabel(proposal.school);
  const deadline = new Date(proposal.voting_deadline).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  const ticker = escapeHtml(proposal.token_ticker);
  const title = escapeHtml(proposal.title);
  const tokenName = escapeHtml(proposal.token_name);
  const proposedBy = proposal.proposed_by_name ? escapeHtml(proposal.proposed_by_name) : "Anonymous";
  const description = proposal.description ? escapeHtml(proposal.description) : null;
  const vars = { ticker, tokenName, school: schoolLabel, title };
  const t = await getEffectiveTemplateFields("new_proposal");

  await batchSend(recipients, (r) => ({
    subject: fillTemplate(t.subject, vars),
    html: buildTemplate({
      title: renderField(t.heading, vars),
      schoolLabel,
      bodyHtml: `<table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;margin-bottom:14px">
        <tr><td style="padding:5px 0;color:#6b7280;width:110px">Token</td><td style="padding:5px 0"><strong>${ticker}</strong> — ${tokenName}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280">Proposed by</td><td style="padding:5px 0">${proposedBy}</td></tr>
        ${proposal.recommended_size_eth ? `<tr><td style="padding:5px 0;color:#6b7280">Size</td><td style="padding:5px 0">${proposal.recommended_size_eth} ETH</td></tr>` : ""}
        <tr><td style="padding:5px 0;color:#6b7280">Deadline</td><td style="padding:5px 0">${deadline}</td></tr>
      </table>
      ${description ? `<p style="font-size:13px;color:#6b7280;border-left:3px solid #1D9E75;padding-left:12px;margin:0;line-height:1.6">${description.slice(0, 280)}${description.length > 280 ? "…" : ""}</p>` : ""}
      ${renderMessageHtml(t.message, vars)}`,
      cta: { label: "Cast your vote →", url: proposalVoteUrl(proposal.school) },
      userId: r.userId,
    }),
  }));
}

export async function send12HourWarningEmail(proposal: Proposal): Promise<void> {
  const recipients = await getSchoolRecipients(proposal.school);
  const schoolLabel = proposalSchoolLabel(proposal.school);
  const total = proposal.yes_votes + proposal.no_votes;
  const yesPct = total > 0 ? Math.round((proposal.yes_votes / total) * 100) : 0;
  const ticker = escapeHtml(proposal.token_ticker);
  const title = escapeHtml(proposal.title);
  const vars = { ticker, school: schoolLabel, title };
  const t = await getEffectiveTemplateFields("proposal_reminder_12h");

  await batchSend(recipients, (r) => ({
    subject: fillTemplate(t.subject, vars),
    html: buildTemplate({
      title: renderField(t.heading, vars),
      schoolLabel,
      bodyHtml: `<p style="font-size:14px;color:#374151;line-height:1.6">
        The vote on <strong>${ticker}</strong> closes in ~12 hours.
        Current tally: <strong>${proposal.yes_votes} yes / ${proposal.no_votes} no</strong>${total > 0 ? ` (${yesPct}% in favor)` : ""}.
      </p>
      ${renderMessageHtml(t.message, vars)}`,
      cta: { label: "Vote now →", url: proposalVoteUrl(proposal.school) },
      userId: r.userId,
    }),
  }));
}

export async function sendProposalResultEmail(proposal: Proposal): Promise<void> {
  if (proposal.status !== "passed" && proposal.status !== "rejected") return;
  const recipients = await getSchoolRecipients(proposal.school);
  const schoolLabel = proposalSchoolLabel(proposal.school);
  const passed = proposal.status === "passed";
  const total = proposal.yes_votes + proposal.no_votes;
  const yesPct = total > 0 ? Math.round((proposal.yes_votes / total) * 100) : 0;
  const ticker = escapeHtml(proposal.token_ticker);
  const title = escapeHtml(proposal.title);
  const resultLabel = passed ? "Passed" : "Rejected";
  const resultEmoji = passed ? "✅" : "❌";
  const vars = { ticker, school: schoolLabel, title, resultLabel, resultEmoji };
  const t = await getEffectiveTemplateFields("proposal_result");
  const message = passed ? t.messagePassed : t.messageRejected;

  await batchSend(recipients, (r) => ({
    subject: fillTemplate(t.subject, vars),
    html: buildTemplate({
      title: renderField(t.heading, vars),
      schoolLabel,
      bodyHtml: `<p style="font-size:14px;color:#374151;line-height:1.6">The vote on <strong>${ticker}</strong> has closed.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;margin:12px 0">
        <tr><td style="padding:5px 0;color:#6b7280;width:110px">Result</td><td style="padding:5px 0"><strong style="color:${passed ? "#1D9E75" : "#ef4444"}">${resultLabel}</strong></td></tr>
        <tr><td style="padding:5px 0;color:#6b7280">Final vote</td><td style="padding:5px 0">${proposal.yes_votes} yes / ${proposal.no_votes} no (${yesPct}% in favor)</td></tr>
      </table>
      ${renderMessageHtml(message, vars)}`,
      cta: { label: "View results →", url: proposalVoteUrl(proposal.school) },
      userId: r.userId,
    }),
  }));
}

export async function sendExecutionEmail(proposal: Proposal): Promise<void> {
  const recipients = await getSchoolRecipients(proposal.school);
  const schoolLabel = proposalSchoolLabel(proposal.school);
  const ticker = escapeHtml(proposal.token_ticker);
  const title = escapeHtml(proposal.title);
  const executionNotes = proposal.execution_notes ? escapeHtml(proposal.execution_notes) : null;
  const executionTx = proposal.execution_tx ? escapeHtml(proposal.execution_tx) : null;
  const vars = { ticker, school: schoolLabel, title };
  const t = await getEffectiveTemplateFields("trade_executed");

  await batchSend(recipients, (r) => ({
    subject: fillTemplate(t.subject, vars),
    html: buildTemplate({
      title: renderField(t.heading, vars),
      schoolLabel,
      bodyHtml: `<p style="font-size:14px;color:#374151;line-height:1.6">The <strong>${ticker}</strong> trade has been executed by your club leadership.</p>
      ${executionNotes ? `<p style="font-size:13px;color:#6b7280;border-left:3px solid #1D9E75;padding-left:12px;margin-top:12px;line-height:1.6">${executionNotes}</p>` : ""}
      ${executionTx ? `<p style="font-size:12px;color:#9ca3af;margin-top:12px;word-break:break-all">Tx: <a href="https://etherscan.io/tx/${executionTx}" style="color:#1D9E75">${executionTx.slice(0, 24)}…</a></p>` : ""}
      ${renderMessageHtml(t.message, vars)}`,
      cta: { label: "View portfolio →", url: proposalVoteUrl(proposal.school) },
      userId: r.userId,
    }),
  }));
}
