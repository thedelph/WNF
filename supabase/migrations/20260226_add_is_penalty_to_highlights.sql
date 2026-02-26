-- Add is_penalty flag to game_highlights (mirrors is_own_goal pattern)
ALTER TABLE game_highlights ADD COLUMN IF NOT EXISTS is_penalty boolean NOT NULL DEFAULT false;
