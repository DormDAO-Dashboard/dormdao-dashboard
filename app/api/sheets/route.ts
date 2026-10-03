import { NextResponse } from "next/server";
import { getSchoolsData } from "@/lib/cache";

// See app/leaderboard/page.tsx for why this is force-dynamic rather than
// revalidate = 600 — avoids a second, independently-timed route cache on
// top of getSchoolsData()'s own.
export const dynamic = "force-dynamic";

export type { Holding, SchoolRowWithHoldings } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await getSchoolsData();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg, schools: [] }, { status: 500 });
  }
}
