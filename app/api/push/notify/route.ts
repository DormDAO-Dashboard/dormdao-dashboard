import { NextRequest, NextResponse } from "next/server";
import { sendPushNotifications, type PushPayload } from "@/lib/push";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, title, body: notifBody, url } = body as Partial<PushPayload>;
  if (!type || !title || !notifBody || !url) {
    return NextResponse.json({ error: "Missing fields: type, title, body, url" }, { status: 400 });
  }

  const result = await sendPushNotifications({ type, title, body: notifBody, url });
  return NextResponse.json(result);
}
