-- ============================================================================
-- RLS lockdown — run in Supabase SQL Editor
-- Generated after auditing every table + confirming actual read/write paths
-- in the codebase (not guessed). All app writes go through service-role API
-- routes except profiles (ProfileForm.tsx writes directly from the browser
-- with the user's own session) and push_subscriptions (spec'd as authenticated
-- own-rows). Service role always bypasses RLS, so none of this touches any
-- existing server-side code path.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TIER 1 — Zero public access, service role only.
-- No CREATE POLICY needed: enabling RLS with no policies = default-deny for
-- anon/authenticated, service_role bypasses RLS entirely.
-- ----------------------------------------------------------------------------

-- login_attempts: logs email/wallet of every failed login. Currently readable
-- by ANY anon key request — a live PII leak.
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- signup_requests: name, email, wallet, school, LinkedIn, Telegram, message.
-- Currently readable by ANY anon key request — a live PII leak.
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- research_notes: only ever read server-side via service role
-- (app/users/[id]/page.tsx), never directly by the browser.
ALTER TABLE public.research_notes ENABLE ROW LEVEL SECURITY;

-- note_votes: only read/written via /api/notes routes (service role).
ALTER TABLE public.note_votes ENABLE ROW LEVEL SECURITY;

-- news_posts: only read/written via /api/news routes (service role).
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- forum_threads / forum_replies / forum_thread_votes: only read/written via
-- /api/forum/* routes (service role).
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_thread_votes ENABLE ROW LEVEL SECURITY;

-- token_documents: only read/written via /api/documents routes (service role).
ALTER TABLE public.token_documents ENABLE ROW LEVEL SECURITY;

-- proposals / proposal_votes: read via /api/proposals, which enforces
-- per-school membership and Main DAO admin checks server-side. Right now,
-- with no RLS, anyone with the public anon key can query these tables
-- DIRECTLY and bypass that access control entirely — this closes that gap.
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_votes ENABLE ROW LEVEL SECURITY;

-- portfolio_snapshots: only read via server-side cache/API, never directly
-- by the browser (unlike portfolio_changes below).
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- TIER 2 — Public read (matches current app behavior), no public write.
-- ----------------------------------------------------------------------------

-- portfolio_changes: read directly by the browser in
-- components/SchoolPortfolioStats.tsx (Activity Feed is intentionally public).
ALTER TABLE public.portfolio_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_changes_public_read"
  ON public.portfolio_changes FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- TIER 3 — profiles: public read (many components read other users' profiles
-- directly), owner-only write. IMPORTANT: with RLS currently OFF, any
-- authenticated user can UPDATE ANY profile row right now, including their
-- own `role` column — a live privilege-escalation path to dorm_admin. The
-- trigger below blocks self-service changes to admin-assigned columns
-- (role, school, wallet_address) on top of the row-level owner check, since
-- a bare "auth.uid() = id" policy alone would still let a user grant
-- themselves admin via a direct client upsert.
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_owner_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS trigger AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.role := OLD.role;
  NEW.school := OLD.school;
  NEW.wallet_address := OLD.wallet_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_admin_fields ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_fields();

-- ----------------------------------------------------------------------------
-- TIER 4 — push_subscriptions: authenticated users, own rows only (as spec'd).
-- ----------------------------------------------------------------------------

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_owner_select"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_owner_insert"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_owner_update"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_owner_delete"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
