import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendPushNotifications } from "@/lib/push";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
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

export const VALID_CATEGORIES = ["general", "token_research", "strategy", "questions", "announcements"];
const VALID_SORTS = ["hot", "new", "top"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") ?? "hot";
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const school = searchParams.get("school");
  const ticker = searchParams.get("ticker");
  const limit = 25;

  const supabase = createServiceClient();
  let query = supabase
    .from("forum_threads")
    .select("id, created_at, title, content, school, author_name, category, token_ticker, upvotes, reply_count, is_pinned")
    .range(offset, offset + limit);

  if (category && VALID_CATEGORIES.includes(category)) query = query.eq("category", category);
  if (school) query = query.eq("school", school);
  if (ticker) query = query.eq("token_ticker", ticker.toUpperCase());

  const validSort = VALID_SORTS.includes(sort) ? sort : "hot";
  query = query.order("is_pinned", { ascending: false });
  if (validSort === "new") {
    query = query.order("created_at", { ascending: false });
  } else if (validSort === "top") {
    query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("upvotes", { ascending: false }).order("reply_count", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const threads = data ?? [];
  const hasMore = threads.length > limit;
  return NextResponse.json({ threads: hasMore ? threads.slice(0, limit) : threads, hasMore });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to post" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("display_name, school")
    .eq("id", user.id)
    .single();

  if (!profile?.school) {
    return NextResponse.json({ error: "Set your school on your profile before posting" }, { status: 403 });
  }

  if (isRateLimited(req)) {
    return NextResponse.json({ error: "Too many posts. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const { title, content, category, token_ticker } = body;

  if (!title?.trim() || title.trim().length < 3) {
    return NextResponse.json({ error: "Title must be at least 3 characters" }, { status: 400 });
  }
  if (title.trim().length > 200) {
    return NextResponse.json({ error: "Title too long (max 200 characters)" }, { status: 400 });
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.trim().length > 5000) {
    return NextResponse.json({ error: "Content too long (max 5000 characters)" }, { status: 400 });
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data, error } = await service
    .from("forum_threads")
    .insert({
      title: title.trim(),
      content: content.trim(),
      school: profile.school,
      user_id: user.id,
      author_name: profile.display_name || "Anonymous",
      category: category || "general",
      token_ticker: token_ticker?.trim().toUpperCase() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const thread = data;
  after(async () => {
    await sendPushNotifications({
      type: "forum",
      title: `💬 New thread: ${thread.title}`,
      body: `${thread.school} posted in ${thread.category}`,
      url: `https://dormdao-dashboard.vercel.app/forum/${thread.id}`,
    }).catch(console.error);
  });

  return NextResponse.json({ thread }, { status: 201 });
}
