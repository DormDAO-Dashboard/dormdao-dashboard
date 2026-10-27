import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-guard";
import { getRepo } from "@/lib/predictions/repo";
import { getHistory } from "@/lib/predictions/quotes";
import { historyStart } from "@/lib/predictions/load";

const DAY_MS = 86_400_000;
const RANGES = ["since", "7d", "30d", "all"] as const;
type Range = (typeof RANGES)[number];

function isRange(value: string | null): value is Range {
  return value !== null && (RANGES as readonly string[]).includes(value);
}

// GET /api/predictions/history?id=<pitch id>&range=since|7d|30d|all
// Chosen-side price history for one pitch, for the pitch page's range buttons.
export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const range = searchParams.get("range");
  if (!id || !isRange(range)) {
    return NextResponse.json({ error: "Expected ?id=<pitch id>&range=since|7d|30d|all" }, { status: 400 });
  }

  const repo = getRepo();
  const [pitch, rounds] = await Promise.all([repo.getPitch(id), repo.listRounds()]);
  if (!pitch) return NextResponse.json({ error: "Pitch not found" }, { status: 404 });

  const now = Date.now();
  const sinceMs = {
    since: historyStart(rounds.find((r) => r.number === pitch.roundNumber)),
    "7d": now - 7 * DAY_MS,
    "30d": now - 30 * DAY_MS,
    // Both APIs reject a 0 start; a year back covers any market's full life.
    all: now - 365 * DAY_MS,
  }[range];

  const points = await getHistory(pitch, sinceMs);
  return NextResponse.json({ points });
}
