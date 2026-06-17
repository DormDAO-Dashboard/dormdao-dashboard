import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

const VALID_CATEGORIES = ["news", "research", "event", "announcement"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const school = searchParams.get("school");
  const category = searchParams.get("category");
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = 20;

  const supabase = createServiceClient();
  let query = supabase
    .from("news_posts")
    .select("id, created_at, title, content, school, category, url, user_id, author_name")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (school) query = query.eq("school", school);
  if (category && VALID_CATEGORIES.includes(category)) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = data ?? [];
  const hasMore = posts.length > limit;

  return NextResponse.json({ posts: hasMore ? posts.slice(0, limit) : posts, hasMore });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to post an update" }, { status: 401 });
  }

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
  const { title, content, category, url } = body;

  if (!title?.trim() || title.trim().length < 3) {
    return NextResponse.json({ error: "Title must be at least 3 characters" }, { status: 400 });
  }
  if (title.trim().length > 200) {
    return NextResponse.json({ error: "Title too long (max 200 characters)" }, { status: 400 });
  }
  if (content && content.trim().length > 2000) {
    return NextResponse.json({ error: "Content too long (max 2000 characters)" }, { status: 400 });
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data, error } = await service
    .from("news_posts")
    .insert({
      title: title.trim(),
      content: content?.trim() || null,
      school: profile.school,
      category: category || "news",
      url: url?.trim() || null,
      user_id: user.id,
      author_name: profile.display_name || "Anonymous",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data }, { status: 201 });
}
