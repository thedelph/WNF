-- Function to safely delete a game and update player streaks
CREATE OR REPLACE FUNCTION delete_game_and_update_streaks(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_players uuid[];
BEGIN
    -- Store affected players before deletion
    affected_players := ARRAY(
        SELECT DISTINCT player_id 
        FROM game_registrations 
        WHERE game_id = p_game_id
    );

    -- Delete the game (this will cascade to related records)
    DELETE FROM games WHERE id = p_game_id;

    -- Update streaks for affected players
    IF array_length(affected_players, 1) > 0 THEN
        UPDATE players
        SET 
            current_streak = calculate_player_streak(id),
            bench_warmer_streak = calculate_bench_warmer_streak(id)
        WHERE id = ANY(affected_players);
    END IF;
END;
$$;
