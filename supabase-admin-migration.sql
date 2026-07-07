-- Run this in your Supabase SQL editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create admin_members table
CREATE TABLE IF NOT EXISTS admin_members (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT        NOT NULL,
  voting_units   INTEGER     NOT NULL DEFAULT 10,
  email          TEXT        UNIQUE,
  wallet_address TEXT        UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT admin_members_email_or_wallet
    CHECK (email IS NOT NULL OR wallet_address IS NOT NULL)
);

-- 2. Enable RLS — all direct client reads blocked; service role bypasses RLS automatically
ALTER TABLE admin_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block direct client access" ON admin_members
  FOR ALL USING (false) WITH CHECK (false);

-- 3. Seed first admin
INSERT INTO admin_members (name, voting_units, email, wallet_address)
VALUES ('Jack Schlosser', 10, 'jack@dormdao.io', '0xF83c27D8770C7fe03ce2BB4D82A11C509e93FB23')
ON CONFLICT DO NOTHING;
