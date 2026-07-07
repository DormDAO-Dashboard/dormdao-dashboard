-- Run this once in your Supabase SQL editor:
-- https://supabase.com/dashboard → your project → SQL Editor

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

-- 2. Enable RLS — direct client access blocked; service role bypasses RLS
ALTER TABLE admin_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block direct client access" ON admin_members
  FOR ALL USING (false) WITH CHECK (false);

-- 3. Seed first admin
--    wallet_address below is the MetaMask wallet used to connect.
--    If you want to use jack@dormdao.io for Google login too, keep the email column as-is.
INSERT INTO admin_members (name, voting_units, email, wallet_address)
VALUES (
  'Jack Schlosser',
  10,
  'jack@dormdao.io',
  '0x8a6e5f901dd621648f41a5f40c5dec322be9cfaa'
)
ON CONFLICT DO NOTHING;

-- NOTE: if you already ran a previous version of this migration with wallet
-- '0xF83c27D8770C7fe03ce2BB4D82A11C509e93FB23', run this instead:
-- UPDATE admin_members
-- SET wallet_address = '0x8a6e5f901dd621648f41a5f40c5dec322be9cfaa'
-- WHERE email = 'jack@dormdao.io';
