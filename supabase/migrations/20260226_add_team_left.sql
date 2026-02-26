-- Add team_left column to games table
-- Records which team plays on the left side of the pitch in the video
-- Default 'blue' matches current behavior (Blue on left, Orange on right)
ALTER TABLE games ADD COLUMN IF NOT EXISTS team_left TEXT DEFAULT 'blue'
  CHECK (team_left IN ('blue', 'orange'));
