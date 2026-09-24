-- ============================================================================
-- Programmatic Liquidation Policy support — run in Supabase SQL Editor
-- Two additions, both needed for app/api/snapshot/route.ts's liquidation
-- threshold check (see lib/fdv.ts) to work for admin-entered positions too:
--
-- 1. positions.entry_fdv_usd — an admin-enterable Entry FDV override for
--    schools whose NAV is computed from the `positions` table rather than
--    the Google Sheet. Sheet-driven schools already have this data (the
--    sheet's own "Entry FDV" column, parsed by lib/sheets.ts's
--    parseHoldings), so this column is only ever read as a fallback for
--    the minority of schools with no sheet backing at all.
--
-- 2. liquidation_alerts — dedupe log so the 90%-warning and
--    threshold-crossed emails each fire once per position, not once per
--    cron cycle for as long as the position stays above the line. Keyed by
--    (school, ticker, investment_date) rather than a positions.id, since
--    sheet-driven schools' holdings have no stable DB row to key off of at
--    all — this is the same natural per-tranche key already used elsewhere
--    (see the buy/sell diffing in app/api/snapshot/route.ts).
-- ============================================================================

ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS entry_fdv_usd numeric;

CREATE TABLE IF NOT EXISTS public.liquidation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school text NOT NULL,
  ticker text NOT NULL,
  investment_date text NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('warning_90pct', 'threshold_crossed')),
  entry_fdv_usd numeric NOT NULL,
  current_fdv_usd numeric NOT NULL,
  multiple_target numeric NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school, ticker, investment_date, alert_type)
);

-- Zero public access, service role only — same model as positions/
-- wallet_login_nonces. The only writer/reader is the snapshot cron
-- (app/api/snapshot/route.ts) via createServiceClient().
ALTER TABLE public.liquidation_alerts ENABLE ROW LEVEL SECURITY;
