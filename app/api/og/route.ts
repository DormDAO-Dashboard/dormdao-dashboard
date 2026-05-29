import { NextRequest, NextResponse } from "next/server";

function extractMeta(html: string, property: string): string {
  const ogProp = html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i"));
  if (ogProp) return ogProp[1];
  const name = html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"));
  if (name) return name[1];
  return "";
}

const cache = new Map<string, { data: object; expires: number }>();

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try { new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  const cached = cache.get(url);
  if (cached && Date.now() < cached.expires) return NextResponse.json(cached.data);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DormDAO/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    const title = extractMeta(html, "title")
      || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      || "";
    const description = extractMeta(html, "description");
    const image = extractMeta(html, "image");
    const siteName = extractMeta(html, "site_name") || new URL(url).hostname.replace("www.", "");

    const data = { title: title.trim(), description: description.trim(), image: image.trim(), siteName };
    cache.set(url, { data, expires: Date.now() + 3_600_000 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
