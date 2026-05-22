import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const results: Record<string, { ok: boolean; error?: string; latency?: number }> = {};

  // Check Sheets
  const t0 = Date.now();
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const r = await fetch(`${base}/api/sheets`, { cache: "no-store" });
    results.sheets = { ok: r.ok, latency: Date.now() - t0 };
  } catch (e) {
    results.sheets = { ok: false, error: String(e) };
  }

  // Check Prices
  const t1 = Date.now();
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/ping",
      { cache: "no-store" }
    );
    results.prices = { ok: r.ok, latency: Date.now() - t1 };
  } catch (e) {
    results.prices = { ok: false, error: String(e) };
  }

  // Check DB
  const t2 = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("research_notes").select("id").limit(1);
    results.database = { ok: !error, error: error?.message, latency: Date.now() - t2 };
  } catch (e) {
    results.database = { ok: false, error: String(e) };
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", services: results, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 207 }
  );
}
