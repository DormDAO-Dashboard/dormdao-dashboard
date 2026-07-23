-- Drop any pre-existing policies on the 3 tables that are still exposing
-- data to the anon key despite RLS being enabled — a leftover permissive
-- policy from earlier development is almost certainly still active.
-- After this runs, these tables go back to Tier 1 (service role only,
-- default-deny for anon/authenticated), matching the original intent.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('research_notes', 'proposals', 'proposal_votes')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Sanity check: this should return zero rows once the above has run.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('research_notes', 'proposals', 'proposal_votes');
