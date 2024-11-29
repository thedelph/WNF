-- Create columns for average ratings if they don't exist
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS average_attack_rating DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS average_defense_rating DECIMAL(4,2);

-- Enable logging for debugging
CREATE OR REPLACE FUNCTION log_debug(message TEXT)
RETURNS void AS $$
BEGIN
  RAISE NOTICE '%', message;
END;
$$ LANGUAGE plpgsql;

-- Function to update player average ratings
CREATE OR REPLACE FUNCTION update_player_average_ratings()
RETURNS TRIGGER AS $$
DECLARE
    games_count INTEGER;
    avg_attack DECIMAL(4,2);
    avg_defense DECIMAL(4,2);
BEGIN
    -- Log the trigger execution
    PERFORM log_debug('Trigger executed for player_id: ' || COALESCE(NEW.rated_player_id::text, OLD.rated_player_id::text));

    -- Get the number of games played together
    SELECT COUNT(*) INTO games_count
    FROM (
        SELECT DISTINCT gr1.game_id
        FROM game_registrations gr1
        JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id
        WHERE gr1.player_id = COALESCE(NEW.rater_id, OLD.rater_id)
        AND gr2.player_id = COALESCE(NEW.rated_player_id, OLD.rated_player_id)
        AND gr1.status = 'played'
        AND gr2.status = 'played'
    ) AS games;

    -- Log the games count
    PERFORM log_debug('Games played together: ' || games_count::text);

    -- Calculate averages only if there are enough games
    IF games_count >= 5 THEN
        WITH qualified_ratings AS (
            SELECT pr.attack_rating, pr.defense_rating
            FROM player_ratings pr
            JOIN players rater ON pr.rater_id = rater.id
            WHERE pr.rated_player_id = COALESCE(NEW.rated_player_id, OLD.rated_player_id)
            AND (
                SELECT COUNT(*)
                FROM game_registrations gr1
                JOIN game_registrations gr2 
                ON gr1.game_id = gr2.game_id
                AND gr1.status = 'played'
                AND gr2.status = 'played'
                WHERE gr1.player_id = pr.rater_id 
                AND gr2.player_id = pr.rated_player_id
            ) >= 5
        )
        SELECT 
            ROUND(AVG(attack_rating)::numeric, 2),
            ROUND(AVG(defense_rating)::numeric, 2)
        INTO avg_attack, avg_defense
        FROM qualified_ratings;

        -- Log the calculated averages
        PERFORM log_debug('Calculated averages - Attack: ' || COALESCE(avg_attack::text, 'NULL') || ', Defense: ' || COALESCE(avg_defense::text, 'NULL'));

        -- Update the player's ratings
        UPDATE players
        SET 
            average_attack_rating = avg_attack,
            average_defense_rating = avg_defense
        WHERE id = COALESCE(NEW.rated_player_id, OLD.rated_player_id);

        -- Log the update
        PERFORM log_debug('Updated player ratings in database');
    ELSE
        PERFORM log_debug('Not enough games played together (minimum 5 required)');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_player_ratings_trigger ON player_ratings;

-- Create trigger
CREATE TRIGGER update_player_ratings_trigger
AFTER INSERT OR UPDATE OR DELETE ON player_ratings
FOR EACH ROW
EXECUTE FUNCTION update_player_average_ratings();

-- Verify trigger installation
DO $$
BEGIN
    PERFORM log_debug('Checking trigger installation...');
    IF EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_player_ratings_trigger'
    ) THEN
        PERFORM log_debug('Trigger successfully installed');
    ELSE
        PERFORM log_debug('WARNING: Trigger not found!');
    END IF;
END $$;
