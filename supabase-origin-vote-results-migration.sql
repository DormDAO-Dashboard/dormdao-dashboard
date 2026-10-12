-- Stores the sub-DAO vote tally a Main DAO proposal had at the school
-- voting app level, captured once at repost time (an immutable snapshot,
-- not a live reference — the origin proposal's own votes don't change
-- after it resolves, so no join-back is needed). NULL for proposals that
-- were never reposted from a school (including every pre-existing row).
-- Run this in the Supabase SQL editor.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS origin_yes_votes INTEGER,
  ADD COLUMN IF NOT EXISTS origin_no_votes INTEGER;
