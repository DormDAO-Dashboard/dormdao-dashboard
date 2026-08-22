-- ============================================================================
-- positions table — run in Supabase SQL Editor
-- Backs the internally-computed leaderboard: admins/school leadership enter
-- fixed position data (ticker, chain, tokens held, cost basis, purchase
-- price, date) here, and the app computes NAV/returns itself from this plus
-- live CoinGecko prices, instead of depending on the Google Sheet.
--
-- A row with ticker = 'ETH' represents idle treasury (uninvested cash), not
-- an actual position — it has no cost basis / return, but does count toward
-- NAV and toward the "% deployed" calculation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school text NOT NULL,
  ticker text NOT NULL,
  blockchain text NOT NULL DEFAULT '',
  tokens numeric NOT NULL DEFAULT 0,
  cost_basis_eth numeric NOT NULL DEFAULT 0,
  -- null = derive from cost_basis_eth + historical ETH price at investment_date
  purchase_price_usd numeric,
  investment_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS positions_school_idx ON public.positions (school);

-- Zero public access, service role only — same model as token_documents.
-- Enabling RLS with no policies = default-deny for anon/authenticated;
-- service_role bypasses RLS entirely. All reads/writes go through
-- app/api/schools/[slug]/positions routes using createServiceClient(),
-- which gate access with canModerate() (school leadership for that school,
-- or a DormDAO admin) server-side.
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
