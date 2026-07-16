import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canModerate } from "@/lib/auth-utils";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: post } = await service
    .from("news_posts")
    .select("user_id, school")
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const isOwner = post.user_id === user.id;
  if (!isOwner) {
    const { data: profile } = await service
      .from("profiles").select("role, school").eq("id", user.id).single();
    if (!canModerate(profile ?? { role: null, school: null }, post.school ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await service.from("news_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
