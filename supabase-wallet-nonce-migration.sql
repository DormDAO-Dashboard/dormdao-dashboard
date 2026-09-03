-- ============================================================================
-- wallet_login_nonces table — run in Supabase SQL Editor
-- Closes a replay window in app/api/auth/wallet/route.ts: the login nonce
-- was only checked for freshness (< 10 minutes old), never for single use —
-- the exact same signed (address, signature, nonce) payload could be
-- resubmitted any number of times within that window and mint a fresh
-- session each time. This table lets the route atomically "claim" a nonce
-- on first successful use (via the primary key's uniqueness) and reject any
-- resubmission, even a still-fresh one.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_login_nonces (
  nonce text PRIMARY KEY,
  used_at timestamptz NOT NULL DEFAULT now()
);

-- Zero public access, service role only — same model as positions/
-- token_documents. Enabling RLS with no policies = default-deny for
-- anon/authenticated; service_role bypasses RLS entirely. The only writer
-- is app/api/auth/wallet/route.ts's createServiceClient().
ALTER TABLE public.wallet_login_nonces ENABLE ROW LEVEL SECURITY;
