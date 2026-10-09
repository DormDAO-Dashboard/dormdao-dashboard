-- Adds NFT holdings to the daily portfolio_snapshots capture, kept in a
-- separate column from the existing `holdings` (liquid-token) column on
-- purpose: app/api/snapshot/route.ts's buy/sell/exit change-detection
-- diffing reads `holdings` directly and has no NFT awareness at all today —
-- mixing NFTs into that same array would make a currently-held NFT look
-- like it "disappeared" every cycle (nothing in that diffing code would
-- ever see it in the CURRENT side of the comparison) and eventually fire a
-- false "sold" notification. A separate column means that diffing logic
-- needs zero changes, and NFT data is purely additive for anything that
-- wants it (season-performance tracking, future Month/Season-to-date NFT
-- figures) via lib/snapshotReturns.ts's getBaselineSnapshot, which already
-- concatenates this onto `holdings` for its callers.
--
-- Run this in the Supabase SQL editor.

ALTER TABLE portfolio_snapshots
  ADD COLUMN IF NOT EXISTS nft_holdings JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
