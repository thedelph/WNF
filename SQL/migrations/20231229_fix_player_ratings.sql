-- Drop existing triggers
DROP TRIGGER IF EXISTS update_average_ratings ON player_ratings;
DROP TRIGGER IF EXISTS update_player_ratings_trigger ON player_ratings;

-- Create a new, corrected trigger function
CREATE OR REPLACE FUNCTION update_player_average_ratings()
RETURNS trigger AS $$
BEGIN
    -- For INSERT or UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Update the rated player's averages
        UPDATE players
        SET 
            attack_rating = (
                SELECT COALESCE(AVG(attack_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = NEW.rated_player_id
            ),
            defense_rating = (
                SELECT COALESCE(AVG(defense_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = NEW.rated_player_id
            )
        WHERE id = NEW.rated_player_id;
        
        RETURN NEW;
    -- For DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        -- Update the rated player's averages
        UPDATE players
        SET 
            attack_rating = (
                SELECT COALESCE(AVG(attack_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = OLD.rated_player_id
            ),
            defense_rating = (
                SELECT COALESCE(AVG(defense_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = OLD.rated_player_id
            )
        WHERE id = OLD.rated_player_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a single trigger that handles all operations
CREATE TRIGGER update_player_ratings_trigger
AFTER INSERT OR UPDATE OR DELETE ON player_ratings
FOR EACH ROW
EXECUTE FUNCTION update_player_average_ratings();

-- Recalculate all averages to fix existing data
UPDATE players p
SET 
    attack_rating = COALESCE((
        SELECT AVG(attack_rating)
        FROM player_ratings
        WHERE rated_player_id = p.id
    ), 0),
    defense_rating = COALESCE((
        SELECT AVG(defense_rating)
        FROM player_ratings
        WHERE rated_player_id = p.id
    ), 0);
