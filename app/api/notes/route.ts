import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Sentiment } from "@/lib/types";

// IP-based rate limit: 10 notes per hour per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(req: NextRequest): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

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
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to post a note" }, { status: 401 });
  }

  // Fetch profile for authoritative name + school
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("display_name, school")
    .eq("id", user.id)
    .single();

  if (!profile?.school) {
    return NextResponse.json({ error: "Set your school on your profile to post a note" }, { status: 403 });
  }

  if (isRateLimited(req)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const { token_ticker, sentiment, content, thesis_type, price_target, time_horizon, url } = body;

  // Use profile data — don't trust client-supplied name/school
  const author_name = profile.display_name || "Anonymous";
  const school = profile.school;
  const user_id = user.id;

  const minLen = url?.trim() ? 10 : 100;
  if (!content || content.trim().length < minLen) {
    return NextResponse.json(
      { error: `Content must be at least ${minLen} characters` },
      { status: 400 }
    );
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }
  if (!["bullish", "bearish", "neutral"].includes(sentiment)) {
    return NextResponse.json({ error: "Invalid sentiment" }, { status: 400 });
  }

  // url column exists — always include it in base payload
  const insertPayload: Record<string, unknown> = {
    author_name: author_name.trim(),
    school: school?.trim() || null,
    token_ticker: token_ticker?.trim().toUpperCase() || null,
    sentiment,
    content: content.trim(),
    user_id: user_id || null,
    url: url?.trim() || null,
  };

  // Attempt to include optional columns; fall back gracefully if they don't exist
  const withNewFields = {
    ...insertPayload,
    thesis_type: thesis_type || null,
    price_target: price_target ? Number(price_target) : null,
    time_horizon: time_horizon || null,
  };

  let { data, error } = await service
    .from("research_notes")
    .insert(withNewFields)
    .select()
    .single();

  // If new columns don't exist yet, retry without them
  if (error?.message?.includes("column")) {
    ({ data, error } = await service
      .from("research_notes")
      .insert(insertPayload)
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
