import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";

// Blocks SSRF: rejects private/loopback/link-local/reserved IP ranges so this
// endpoint can't be used to reach internal infrastructure via a fetched
// og:title/description scrape. Checked against the resolved address, not
// just the hostname string, since an attacker-controlled DNS record can
// point any hostname at an internal IP.
function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fe80:")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:")) return isPrivateOrReservedIp(lower.replace("::ffff:", ""));
    return false;
  }
  return true; // couldn't parse — fail closed
}

async function isSafeUrl(url: string): Promise<boolean> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  try {
    const addresses = await lookup(parsed.hostname, { all: true });
    return addresses.every((a) => !isPrivateOrReservedIp(a.address));
  } catch {
    return false; // DNS resolution failure — fail closed
  }
}

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try { new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  const cached = cache.get(url);
  if (cached && Date.now() < cached.expires) return NextResponse.json(cached.data);

  if (!(await isSafeUrl(url))) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

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
