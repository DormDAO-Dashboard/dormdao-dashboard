import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import type { PushPayload } from "@/lib/push";

// Change to "alerts@dormdao.io" once domain is verified in Resend
const FROM_ADDRESS = "onboarding@resend.dev";

export async function sendEmailNotifications(payload: PushPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const service = createServiceClient();

  const { data: profiles } = await service
    .from("profiles")
    .select("id")
    .eq("email_notifications", true);

  if (!profiles?.length) return;

  const emails: string[] = [];
  for (const profile of profiles) {
    const { data } = await service.auth.admin.getUserById(profile.id);
    if (data.user?.email) emails.push(data.user.email);
  }

  if (!emails.length) return;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: emails,
    subject: payload.title,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <p style="font-size:15px;color:#111">${payload.body}</p>
        <a href="${payload.url}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#1D9E75;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          View on DormDAO →
        </a>
        <p style="margin-top:24px;font-size:11px;color:#999">
          You're receiving this because you enabled email alerts on DormDAO.
        </p>
      </div>
    `,
  });
}
