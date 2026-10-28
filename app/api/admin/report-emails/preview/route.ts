import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-guard";
import { escapeHtml } from "@/lib/email";
import { buildPortfolioReportEmail, buildLeaderboardDigestEmail } from "@/lib/report-emails";

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
  let email;
  if (type === "portfolio") {
    const slug = req.nextUrl.searchParams.get("school");
    if (!slug) return NextResponse.json({ error: "?school=<slug> is required" }, { status: 400 });
    email = await buildPortfolioReportEmail(slug);
    if (!email) return NextResponse.json({ error: `No current data for school "${slug}"` }, { status: 404 });
  } else if (type === "leaderboard") {
    email = await buildLeaderboardDigestEmail();
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
  ${email.html}
</body></html>`;

  return new NextResponse(page, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
