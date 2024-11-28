-- First disable any existing triggers
ALTER TABLE games DISABLE TRIGGER set_game_needs_completion;

-- Set all existing games to not need completion
UPDATE games
SET needs_completion = false
WHERE created_at <= '2024-11-28';

-- Re-enable triggers
ALTER TABLE games ENABLE TRIGGER set_game_needs_completion;
