import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyUnsubToken } from "@/lib/email";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  if (!uid || !token) {
    return new NextResponse("Missing parameters.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  if (!verifyUnsubToken(uid, token)) {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 403, headers: { "Content-Type": "text/plain" } });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ vote_reminder_emails: false, email_notifications: false })
    .eq("id", uid);

  if (error) {
    return new NextResponse("Something went wrong. Please try again.", { status: 500, headers: { "Content-Type": "text/plain" } });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dormdao-dashboard.vercel.app";
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed — DormDAO</title>
  <style>
    body { font-family: sans-serif; background: #0a0a0a; color: #e5e7eb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { max-width: 400px; text-align: center; padding: 40px 32px; background: #111; border: 1px solid #1f2937; border-radius: 16px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 10px; }
    p { font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 20px; }
    a { display: inline-block; padding: 10px 22px; background: #1D9E75; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>You've been unsubscribed</h1>
    <p>You won't receive proposal or trade emails from DormDAO anymore.</p>
    <p>Changed your mind? You can re-enable email notifications anytime from your profile settings.</p>
    <a href="${appUrl}/profile">Go to Profile Settings →</a>
  </div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
