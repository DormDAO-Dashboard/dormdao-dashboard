import { NextResponse } from "next/server";
import { fetchSheetsData } from "@/lib/sheets";

export const revalidate = 300;

export type { Holding, SchoolRowWithHoldings } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await fetchSheetsData();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg, schools: [] }, { status: 500 });
  }
}
