import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Sentiment } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sentiment = searchParams.get("sentiment") as Sentiment | null;
  const token = searchParams.get("token");
  const school = searchParams.get("school");
  const sort = searchParams.get("sort") || "recent";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServiceClient();
  let query = supabase
    .from("research_notes")
    .select("*", { count: "exact" });

  if (sentiment) query = query.eq("sentiment", sentiment);
  if (token) query = query.ilike("token_ticker", token);
  if (school) query = query.ilike("school", `%${school}%`);

  if (sort === "upvotes") {
    query = query.order("upvotes", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notes: data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { author_name, school, token_ticker, sentiment, content, user_id } = body;

  if (!author_name?.trim()) {
    return NextResponse.json({ error: "Author name required" }, { status: 400 });
  }
  if (!content || content.trim().length < 20) {
    return NextResponse.json(
      { error: "Content must be at least 20 characters" },
      { status: 400 }
    );
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }
  if (!["bullish", "bearish", "neutral"].includes(sentiment)) {
    return NextResponse.json({ error: "Invalid sentiment" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("research_notes")
    .insert({
      author_name: author_name.trim(),
      school: school?.trim() || null,
      token_ticker: token_ticker?.trim().toUpperCase() || null,
      sentiment,
      content: content.trim(),
      user_id: user_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
