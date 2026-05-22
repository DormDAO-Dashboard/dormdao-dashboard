-- DormDAO Portfolio Dashboard Database Schema
-- Run this in your Supabase SQL editor

-- Sentiment enum
CREATE TYPE sentiment AS ENUM ('bullish', 'bearish', 'neutral');

-- Research notes
CREATE TABLE IF NOT EXISTS research_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author_name TEXT NOT NULL,
  school TEXT,
  token_ticker TEXT,
  sentiment sentiment NOT NULL DEFAULT 'neutral',
  content TEXT NOT NULL,
  upvotes INT NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Votes (one per user per note)
CREATE TABLE IF NOT EXISTS note_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (note_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notes_sentiment ON research_notes(sentiment);
CREATE INDEX IF NOT EXISTS idx_notes_token ON research_notes(token_ticker);
CREATE INDEX IF NOT EXISTS idx_notes_school ON research_notes(school);
CREATE INDEX IF NOT EXISTS idx_notes_created ON research_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_upvotes ON research_notes(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_votes_note ON note_votes(note_id);

-- RLS Policies
ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read notes
CREATE POLICY "notes_public_read" ON research_notes
  FOR SELECT USING (true);

-- Anyone can insert notes (auth optional)
CREATE POLICY "notes_public_insert" ON research_notes
  FOR INSERT WITH CHECK (true);

-- Users can delete their own notes
CREATE POLICY "notes_own_delete" ON research_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can read votes
CREATE POLICY "votes_public_read" ON note_votes
  FOR SELECT USING (true);

-- Authenticated users can insert votes
CREATE POLICY "votes_auth_insert" ON note_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Helper function to increment upvotes atomically
CREATE OR REPLACE FUNCTION increment_note_upvotes(p_note_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE research_notes SET upvotes = upvotes + 1 WHERE id = p_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed some example notes for development
INSERT INTO research_notes (author_name, school, token_ticker, sentiment, content) VALUES
  ('Alex Chen', 'MIT', 'ETH', 'bullish', 'Ethereum''s upcoming upgrades around blob throughput are being underpriced by the market. EIP-4844 reduced L2 costs by 10x and there is still significant room for TVL migration from L1 to L2s which will drive sequencer revenue back to ETH.'),
  ('Sarah Kim', 'Stanford', 'SOL', 'bullish', 'Solana continues to dominate consumer crypto with Firedancer expected to increase TPS dramatically. The recent memecoin cycle proved Solana can handle retail demand better than any other chain. Our position is still well below target allocation.'),
  ('Marcus Johnson', 'Yale', 'LINK', 'neutral', 'Chainlink is executing on CCIP but the market has been slow to price in cross-chain composability. Watching for enterprise partnership announcements in Q3. Hold for now, evaluate adding on any 20%+ dip.'),
  ('Priya Patel', 'Harvard', 'PENDLE', 'bullish', 'Pendle is the most interesting yield primitive in DeFi right now. Fixed yield is a multi-trillion dollar market in TradFi and Pendle has first-mover advantage. TVL growth has been exponential and the protocol still has low institutional awareness.'),
  ('James Wilson', 'Princeton', 'ARB', 'bearish', 'Arbitrum governance has been disappointing and STIP round 2 dilution concerns are real. The L2 wars are accelerating and Arbitrum''s first-mover advantage may not be enough. Considering trimming position if no catalysts emerge.');
