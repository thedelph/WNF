-- Add completed column to games table
ALTER TABLE games ADD COLUMN completed BOOLEAN DEFAULT false;

-- Update existing games to be marked as completed
UPDATE games SET completed = true WHERE date < NOW();

-- Recreate the get_players_with_game_count function to use the completed column
CREATE OR REPLACE FUNCTION get_players_with_game_count(current_player_id UUID)
RETURNS TABLE (
    id UUID,
    friendly_name TEXT,
    games_played BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.friendly_name,
        COUNT(DISTINCT gr1.game_id)::BIGINT as games_played
    FROM players p
    LEFT JOIN game_registrations gr1 ON gr1.player_id = p.id
        AND gr1.status IN ('selected', 'confirmed')  -- Only count games where players were selected or confirmed
    LEFT JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id
        AND gr2.player_id = current_player_id
        AND gr2.status IN ('selected', 'confirmed')  -- Only count games where the current player was selected or confirmed
    AND gr1.game_id IN (
        SELECT g.id FROM games g WHERE g.completed = true
    )
    WHERE p.id != current_player_id
    GROUP BY p.id, p.friendly_name
    ORDER BY p.friendly_name;
END;
$$ LANGUAGE plpgsql;
