-- Drop existing constraint and trigger if they exist
DROP TRIGGER IF EXISTS set_game_needs_completion ON games;
DROP FUNCTION IF EXISTS update_game_needs_completion();

-- Drop existing constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS check_needs_completion;

-- Add check constraint to ensure needs_completion is set appropriately
-- Only for games created after 2024-11-28
ALTER TABLE games
ADD CONSTRAINT check_needs_completion 
CHECK (
  (needs_completion = true AND created_at > '2024-11-28' AND (score_blue IS NULL OR score_orange IS NULL OR outcome IS NULL)) OR
  (needs_completion = false)
);

-- Create function to automatically set needs_completion
CREATE OR REPLACE FUNCTION update_game_needs_completion()
RETURNS trigger AS $$
BEGIN
  -- Only set needs_completion for games created from today onwards
  IF NEW.created_at > '2024-11-28'::timestamp AND
     (NEW.score_blue IS NULL OR NEW.score_orange IS NULL OR NEW.outcome IS NULL) THEN
    NEW.needs_completion := true;
  ELSE
    NEW.needs_completion := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update needs_completion
CREATE TRIGGER set_game_needs_completion
  BEFORE INSERT OR UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_game_needs_completion();
