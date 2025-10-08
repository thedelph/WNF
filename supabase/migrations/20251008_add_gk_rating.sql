-- Add Goalkeeper (GK) Rating Feature
-- Date: October 8, 2025
-- This migration adds a fourth rating metric for goalkeeper ability

-- 1. Add gk_rating column to player_ratings table
ALTER TABLE player_ratings
ADD COLUMN gk_rating NUMERIC;

-- Add check constraint for gk_rating (0-10 scale, same as other ratings)
ALTER TABLE player_ratings
ADD CONSTRAINT player_ratings_gk_rating_check
CHECK (gk_rating IS NULL OR (gk_rating >= 0 AND gk_rating <= 10));

-- 2. Add GK rating columns to players table
ALTER TABLE players
ADD COLUMN gk NUMERIC; -- Manual/default GK rating

ALTER TABLE players
ADD COLUMN average_gk_rating NUMERIC; -- Calculated average from all ratings

-- 3. Update the trigger function to calculate GK rating averages
CREATE OR REPLACE FUNCTION update_player_average_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update average ratings for the rated player
    UPDATE players
    SET
        average_attack_rating = (
            SELECT AVG(attack_rating)
            FROM player_ratings
            WHERE rated_player_id = NEW.rated_player_id
            AND attack_rating IS NOT NULL
        ),
        average_defense_rating = (
            SELECT AVG(defense_rating)
            FROM player_ratings
            WHERE rated_player_id = NEW.rated_player_id
            AND defense_rating IS NOT NULL
        ),
        average_game_iq_rating = (
            SELECT AVG(game_iq_rating)
            FROM player_ratings
            WHERE rated_player_id = NEW.rated_player_id
            AND game_iq_rating IS NOT NULL
        ),
        average_gk_rating = (
            SELECT AVG(gk_rating)
            FROM player_ratings
            WHERE rated_player_id = NEW.rated_player_id
            AND gk_rating IS NOT NULL
        )
    WHERE id = NEW.rated_player_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger 'trigger_update_player_average_ratings' already exists
-- and will automatically use the updated function

-- 4. Add comment for documentation
COMMENT ON COLUMN player_ratings.gk_rating IS 'Goalkeeper rating (0-10 scale). Measures shot-stopping, positioning, distribution, command of area, and 1v1 ability.';
COMMENT ON COLUMN players.gk IS 'Manual/default goalkeeper rating';
COMMENT ON COLUMN players.average_gk_rating IS 'Average goalkeeper rating calculated from all received ratings';

-- 5. Update the player_ratings_history table structure if it doesn't include gk_rating
-- (The history trigger will automatically capture the new column)
