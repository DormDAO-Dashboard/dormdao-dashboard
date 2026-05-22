import { NextResponse } from "next/server";
import { getSchoolsData } from "@/lib/cache";

export const revalidate = 300;

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
