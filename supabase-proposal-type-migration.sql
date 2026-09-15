-- Adds a buy/sell distinction to proposals. Every proposal created before
-- this migration was implicitly a buy (there was no way to submit anything
-- else), so existing rows default to 'buy' and need no backfill.
-- Run this in the Supabase SQL editor.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS proposal_type TEXT NOT NULL DEFAULT 'buy'
  CHECK (proposal_type IN ('buy', 'sell'));
