import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}

export async function POST() {
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
