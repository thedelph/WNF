-- Fix the get_players_with_game_count function to correctly count shared games
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
    LEFT JOIN (
        SELECT gr1.player_id, gr1.game_id
        FROM game_registrations gr1
        INNER JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id
            AND gr2.player_id = current_player_id
            AND gr2.status IN ('selected', 'confirmed')
        INNER JOIN games g ON gr1.game_id = g.id
            AND g.completed = true
        WHERE gr1.status IN ('selected', 'confirmed')
    ) gr1 ON gr1.player_id = p.id
    WHERE p.id != current_player_id
    GROUP BY p.id, p.friendly_name
    ORDER BY p.friendly_name;
END;
$$ LANGUAGE plpgsql;
