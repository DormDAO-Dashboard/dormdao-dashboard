-- Adds an optional Google Drive pitch-recording link to proposals.
-- Run this in the Supabase SQL editor.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS pitch_recording_url TEXT;
