-- List all triggers on player_ratings
SELECT 
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'player_ratings';

-- Drop any problematic triggers if found
DROP TRIGGER IF EXISTS check_rating_trigger ON player_ratings;
DROP TRIGGER IF EXISTS update_timestamp_trigger ON player_ratings;

-- Recreate the timestamp trigger properly
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_ratings_timestamp
    BEFORE UPDATE ON player_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
