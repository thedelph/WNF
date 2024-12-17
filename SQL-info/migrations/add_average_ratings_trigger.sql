-- Function to calculate and update average ratings
CREATE OR REPLACE FUNCTION update_player_average_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update average ratings for the rated player
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
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update average ratings
CREATE TRIGGER update_average_ratings
AFTER INSERT OR UPDATE OR DELETE ON player_ratings
FOR EACH ROW
EXECUTE FUNCTION update_player_average_ratings();

-- Update all existing average ratings
UPDATE players p
SET 
    attack_rating = (
        SELECT COALESCE(AVG(attack_rating), 0)
        FROM player_ratings
        WHERE rated_player_id = p.id
    ),
    defense_rating = (
        SELECT COALESCE(AVG(defense_rating), 0)
        FROM player_ratings
        WHERE rated_player_id = p.id
    );
