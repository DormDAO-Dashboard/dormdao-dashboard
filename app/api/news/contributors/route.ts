import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("news_posts")
    .select("author_name, school")
    .not("author_name", "is", null);

  if (error) {
    return NextResponse.json({ contributors: [] }, { status: 500 });
  }

  const counts = new Map<string, { author_name: string; school: string; count: number }>();
  for (const row of data ?? []) {
    if (!row.author_name) continue;
    const key = `${row.author_name}::${row.school}`;
    const entry = counts.get(key) ?? { author_name: row.author_name, school: row.school ?? "", count: 0 };
    entry.count++;
    counts.set(key, entry);
  }

  const contributors = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({ contributors });
}
