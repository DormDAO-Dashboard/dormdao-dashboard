import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: noteId } = await params;

  // user_id is derived from the session, never trusted from the request body —
  // a client-supplied user_id would let anyone vote as someone else, or
  // (if omitted) skip the duplicate-vote check entirely.
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to vote" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("note_votes")
    .select("id")
    .eq("note_id", noteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already voted" }, { status: 409 });
  }

  const { error: voteErr } = await supabase
    .from("note_votes")
    .insert({ note_id: noteId, user_id: user.id });
  if (voteErr) return NextResponse.json({ error: voteErr.message }, { status: 500 });

  const { data, error } = await supabase.rpc("increment_upvotes", {
    note_id: noteId,
  });

  if (error) {
    // Fallback: direct update
    const { error: updateErr } = await supabase.rpc("increment_note_upvotes", {
      p_note_id: noteId,
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, data });
}
