import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-guard";
import { escapeHtml } from "@/lib/email";
import {
  buildPortfolioReportEmail, buildLeaderboardDigestEmail, type BuiltEmail, type ReviewStatus,
} from "@/lib/report-emails";

// Shown above the email, never inside it: the digest's sign-off status and
// every open item its accuracy checks found.
function reviewBanner(review: ReviewStatus): string {
  const items = review.flags.length
    ? review.flags.map((f) => `<li style="margin-top:4px">${escapeHtml(f)}</li>`).join("")
    : `<li style="margin-top:4px">No automatic flags. Still check figures against the dashboard before approving.</li>`;
  return `<div style="max-width:680px;margin:0 auto 14px;padding:12px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;font-family:sans-serif;font-size:12px;color:#78350f;line-height:1.5">
    <strong style="text-transform:uppercase;letter-spacing:.05em">In review: not approved to send</strong>
    <ul style="margin:6px 0 0;padding-left:18px">${items}</ul>
  </div>`;
}

// Renders one of the monthly report emails exactly as it would be sent, with
// today's live data, as a standalone HTML page — loaded in an iframe by the
// admin Email Functions page (AdminMonthlyReportsSection), or opened
// directly in a new tab. Admin-only, read-only: never sends anything.
//
//   ?type=portfolio&school=<slug>   Monthly Portfolio Report for one school
//   ?type=leaderboard               Monthly Leaderboard Digest
export async function GET(req: NextRequest) {
  if (!await getAdminUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  let email: BuiltEmail;
  let review: ReviewStatus | undefined;
  if (type === "portfolio") {
    const slug = req.nextUrl.searchParams.get("school");
    if (!slug) return NextResponse.json({ error: "?school=<slug> is required" }, { status: 400 });
    const report = await buildPortfolioReportEmail(slug);
    if (!report) return NextResponse.json({ error: `No current data for school "${slug}"` }, { status: 404 });
    email = report;
  } else if (type === "leaderboard") {
    const digest = await buildLeaderboardDigestEmail();
    email = digest;
    review = digest.review;
  } else {
    return NextResponse.json({ error: "?type must be portfolio or leaderboard" }, { status: 400 });
  }

  const page = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(email.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6">
  <div style="max-width:680px;margin:0 auto 14px;font-family:sans-serif;font-size:12px;color:#6b7280">
    <span style="text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:#9ca3af">Subject</span>&nbsp;&nbsp;${escapeHtml(email.subject)}
  </div>
  ${review ? reviewBanner(review) : ""}
  ${email.html}
</body></html>`;

  return new NextResponse(page, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
