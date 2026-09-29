-- ============================================================================
-- Fixes liquidation_alerts' dedupe key — run in Supabase SQL Editor.
--
-- Only needed if supabase-liquidation-policy-migration.sql was already run
-- BEFORE this fix — safe/idempotent to run either way (no-ops if the table
-- doesn't exist yet, or if the constraint is already correct, including on
-- a second run of this same file). If you haven't run the original
-- migration at all yet, just run the updated version of that file instead;
-- you don't need this one.
--
-- The original UNIQUE (school, ticker, investment_date, alert_type) let a
-- position re-alert every time it crossed the liquidation threshold again
-- (dipping back under and re-crossing counted as a "new" position because
-- investment_date was part of the key) — e.g. NYU's $ZEC re-emailed after
-- crossing, dipping under, and crossing again. Admins should get at most
-- ONE 90%-warning and ONE threshold-crossed email per (school, ticker)
-- ever, so the key drops investment_date entirely.
-- ============================================================================

DO $$
DECLARE
  old_constraint text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'liquidation_alerts') THEN

    -- Collapse any duplicate (school, ticker, alert_type) rows down to the
    -- earliest one before the tighter constraint is added below — it would
    -- otherwise fail to apply over existing duplicates (e.g. ZEC's repeat
    -- threshold_crossed rows from the bug this migration fixes).
    DELETE FROM public.liquidation_alerts
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY school, ticker, alert_type
          ORDER BY sent_at ASC, id ASC
        ) AS rn
        FROM public.liquidation_alerts
      ) ranked
      WHERE rn > 1
    );

    -- Already fixed (e.g. this file was already run once) — nothing left to do.
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'liquidation_alerts_school_ticker_alert_type_key'
        AND conrelid = 'public.liquidation_alerts'::regclass
    ) THEN
      -- Only one unique constraint is ever created on this table (by the
      -- original migration) — drop it, whatever its exact name (Postgres
      -- may have truncated an auto-generated one to its 63-byte identifier
      -- limit, so it's located dynamically rather than assumed), then add
      -- the corrected one.
      SELECT conname INTO old_constraint
      FROM pg_constraint
      WHERE conrelid = 'public.liquidation_alerts'::regclass AND contype = 'u'
      LIMIT 1;

      IF old_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.liquidation_alerts DROP CONSTRAINT %I', old_constraint);
      END IF;

      ALTER TABLE public.liquidation_alerts
        ADD CONSTRAINT liquidation_alerts_school_ticker_alert_type_key UNIQUE (school, ticker, alert_type);
    END IF;

  END IF;
END $$;
