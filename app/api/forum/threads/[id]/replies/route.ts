import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to reply" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("display_name, school")
    .eq("id", user.id)
    .single();

  if (!profile?.school) {
    return NextResponse.json({ error: "Set your school on your profile before replying" }, { status: 403 });
  }

  const { data: thread } = await service
    .from("forum_threads")
    .select("id")
    .eq("id", id)
    .single();

  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const body = await req.json();
  const { content } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Reply cannot be empty" }, { status: 400 });
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: "Reply too long (max 2000 characters)" }, { status: 400 });
  }

  const { data: reply, error: replyErr } = await service
    .from("forum_replies")
    .insert({
      thread_id: id,
      content: content.trim(),
      school: profile.school,
      user_id: user.id,
      author_name: profile.display_name || "Anonymous",
    })
    .select()
    .single();

  if (replyErr) return NextResponse.json({ error: replyErr.message }, { status: 500 });

  await service.rpc("increment_reply_count", { p_thread_id: id });

  return NextResponse.json({ reply }, { status: 201 });
}
