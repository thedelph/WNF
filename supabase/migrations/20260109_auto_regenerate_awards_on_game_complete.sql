-- Migration: Auto-regenerate awards when game is completed
-- Date: 2026-01-09
-- Description: Adds a trigger that automatically recalculates awards when a game is marked as complete
-- This ensures the Hall of Fame stays up-to-date without manual intervention

-- Trigger function to regenerate awards when game is completed
CREATE OR REPLACE FUNCTION trigger_regenerate_awards_on_game_complete()
RETURNS TRIGGER AS $$
DECLARE
  game_year INTEGER;
BEGIN
  -- Only run when game is newly completed
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    -- Get the year of the completed game
    game_year := EXTRACT(YEAR FROM NEW.date);

    -- Recalculate awards for that specific year
    PERFORM calculate_awards(game_year);

    -- Also recalculate all-time awards
    PERFORM calculate_awards(NULL);

    RAISE NOTICE 'Awards recalculated for year % and all-time after game % completion', game_year, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on games table
-- Fires after UPDATE when completed changes to true
DROP TRIGGER IF EXISTS trigger_awards_on_game_complete ON games;
CREATE TRIGGER trigger_awards_on_game_complete
  AFTER UPDATE ON games
  FOR EACH ROW
  WHEN (NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false))
  EXECUTE FUNCTION trigger_regenerate_awards_on_game_complete();

-- Add comment for documentation
COMMENT ON FUNCTION trigger_regenerate_awards_on_game_complete() IS
  'Automatically recalculates awards when a game is marked as completed. Recalculates both the specific year and all-time awards.';

COMMENT ON TRIGGER trigger_awards_on_game_complete ON games IS
  'Triggers award recalculation when a game is completed via HistoricalGames admin page or any other method.';
