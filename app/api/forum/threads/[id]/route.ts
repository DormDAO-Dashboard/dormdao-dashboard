import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canModerate } from "@/lib/auth-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = createServiceClient();

  const { data: thread, error } = await service
    .from("forum_threads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const { data: replies } = await service
    .from("forum_replies")
    .select("id, created_at, content, school, author_name, upvotes")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ thread, replies: replies ?? [] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: thread } = await service
    .from("forum_threads")
    .select("user_id, school")
    .eq("id", id)
    .single();

  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const isOwner = thread.user_id === user.id;
  if (!isOwner) {
    const { data: profile } = await service
      .from("profiles").select("role, school").eq("id", user.id).single();
    if (!canModerate(profile ?? {}, thread.school ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await service.from("forum_threads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
