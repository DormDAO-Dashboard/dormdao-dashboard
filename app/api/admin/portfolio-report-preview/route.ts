import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { getSchoolsData } from "@/lib/cache";
import { schoolNameFromSlug } from "@/lib/schoolData";
import {
  getPortfolioMonthToDateReturn, getPortfolioSeasonToDateReturn,
  getPositionMonthToDateReturns, getPositionSeasonToDateReturns,
} from "@/lib/snapshotReturns";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined)) return user;
  const service = createServiceClient();
  const { data: prof } = await service.from("profiles").select("role").eq("id", user.id).single();
  return prof?.role === "dorm_admin" ? user : null;
}

// Read-only preview of the real Month-to-Date / Season-to-date figures the
// snapshot history in lib/snapshotReturns.ts can currently produce for a
// school — how the portfolio report email's illustrative (starred) columns
// get verified and eventually replaced as post-2026-10-01 snapshots pile
// up. Each `null` / missing-ticker result below just means "no snapshot yet
// at/after that window's start" rather than an error.
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("school");
  if (!slug) return NextResponse.json({ error: "?school=<slug> is required" }, { status: 400 });

  const schoolName = schoolNameFromSlug(slug);
  if (!schoolName) return NextResponse.json({ error: `Unknown school slug "${slug}"` }, { status: 404 });

  const { schools } = await getSchoolsData();
  const school = schools.find((s) => s.name === schoolName);
  if (!school) return NextResponse.json({ error: `No current data for ${schoolName}` }, { status: 404 });

  const ethHolding = (school.holdings ?? []).find((h) => h.ticker === "ETH");
  const currentEthPriceUsd = ethHolding?.tokens ? (ethHolding.marketValueUsd ?? 0) / ethHolding.tokens : 0;

  const currentHoldings = (school.holdings ?? []).map((h) => ({ ticker: h.ticker, marketValueUsd: h.marketValueUsd }));

  const [portfolioMtd, portfolioSeason, positionMtd, positionSeason] = await Promise.all([
    getPortfolioMonthToDateReturn(schoolName, school.nav, currentEthPriceUsd),
    getPortfolioSeasonToDateReturn(schoolName, school.nav, currentEthPriceUsd),
    getPositionMonthToDateReturns(schoolName, currentEthPriceUsd, currentHoldings),
    getPositionSeasonToDateReturns(schoolName, currentEthPriceUsd, currentHoldings),
  ]);

  return NextResponse.json({
    school: schoolName,
    navUsd: school.nav,
    currentEthPriceUsd,
    portfolio: { monthToDate: portfolioMtd, seasonToDate: portfolioSeason },
    positions: { monthToDate: positionMtd, seasonToDate: positionSeason },
  });
}
