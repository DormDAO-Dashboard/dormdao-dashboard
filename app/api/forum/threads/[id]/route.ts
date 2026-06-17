import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

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
