import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getMembers } from "@/lib/members-store";
import { SCHOOL_NAMES } from "@/lib/schoolData";
import { Resend } from "resend";
import { sendInviteEmail } from "@/lib/email";

const FROM_ADDRESS = "onboarding@resend.dev";

async function notifyAdmins(name: string, email: string, school: string, wallet: string | null, message: string | null) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const adminEmail = process.env.ADMIN_EMAIL ?? "jack@dormdao.io";
  const extraEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim()).filter(Boolean);
  const recipients = [adminEmail, ...extraEmails];

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: recipients,
    subject: `New DormDAO signup request — ${name} (${school})`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="font-size:18px;margin-bottom:4px">New Signup Request</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#555;width:120px">Name</td><td style="padding:6px 0"><strong>${name}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#555">Email</td><td style="padding:6px 0">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#555">School</td><td style="padding:6px 0">${school}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Wallet</td><td style="padding:6px 0;font-family:monospace">${wallet ?? "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#555;vertical-align:top">Message</td><td style="padding:6px 0">${message ?? "—"}</td></tr>
        </table>
        <a href="https://dormdao-dashboard.vercel.app/admin" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1D9E75;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Review in Admin →
        </a>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    name?: string; email?: string; school?: string;
    wallet_address?: string; message?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { name, email, school, wallet_address, message, grad_year, major, linkedin, telegram } = body as typeof body & {
    grad_year?: number; major?: string; linkedin?: string; telegram?: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email?.trim() || !email.includes("@")) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  if (!school?.trim() || !(SCHOOL_NAMES as readonly string[]).includes(school.trim())) {
    return NextResponse.json({ error: "Valid school is required" }, { status: 400 });
  }

  const members = await getMembers();
  const alreadyRegistered = members.some(
    (m) => m.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (alreadyRegistered) {
    return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
  }

  const service = createServiceClient();
  const { error } = await service.from("signup_requests").insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    school: school.trim(),
    wallet_address: wallet_address?.trim() || null,
    message: message?.trim() || null,
    grad_year: typeof grad_year === "number" ? grad_year : null,
    major: major?.trim() || null,
    linkedin: linkedin?.trim() || null,
    telegram: telegram?.trim() || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  notifyAdmins(name.trim(), email.trim(), school.trim(), wallet_address?.trim() || null, message?.trim() || null)
    .catch(console.error);

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) {
    const svcCheck = createServiceClient();
    const { data: pf } = await svcCheck.from("profiles").select("role").eq("id", user.id).single();
    if (pf?.role !== "dorm_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("signup_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) {
    const svcCheck = createServiceClient();
    const { data: pf } = await svcCheck.from("profiles").select("role").eq("id", user.id).single();
    if (pf?.role !== "dorm_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { id: string; action: "approve" | "reject" };
  if (!body.id || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: request } = await service
    .from("signup_requests")
    .select("*")
    .eq("id", body.id)
    .single();

  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const status = body.action === "approve" ? "approved" : "rejected";
  await service.from("signup_requests").update({
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.email ?? user.id,
  }).eq("id", body.id);

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && body.action === "approve") {
    sendInviteEmail({ to: request.email, name: request.name, school: request.school }).catch(console.error);
  }
  if (apiKey && body.action === "reject") {
    const resend = new Resend(apiKey);
    resend.emails.send({
      from: FROM_ADDRESS,
      to: request.email,
      subject: "Your DormDAO access request",
      html: `<div style="font-family:sans-serif;max-width:480px">
        <p style="font-size:15px">Hi ${request.name},</p>
        <p style="font-size:14px;color:#444">Your DormDAO request was not approved at this time. Contact your chapter lead for more information.</p>
      </div>`,
    }).catch(console.error);
  }

  return NextResponse.json({ success: true, status });
}
