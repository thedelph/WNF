-- Update calculate_player_xp function to fix XP calculation
CREATE OR REPLACE FUNCTION calculate_player_xp(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_base_xp integer := 0;
    v_reserve_xp integer := 0;
    v_total_base_xp integer;
    v_streak_modifier decimal;
    v_bench_warmer_modifier decimal;
    v_unpaid_games_modifier decimal;
    v_final_xp integer;
    v_current_streak integer;
    v_bench_warmer_streak integer;
    v_unpaid_games_count integer;
    v_latest_game_sequence integer;
BEGIN
    -- Get the latest game sequence number
    SELECT COALESCE(MAX(sequence_number), 0) INTO v_latest_game_sequence FROM games WHERE completed = true AND is_historical = true;

    -- Calculate base XP from game participation
    WITH player_games AS (
        SELECT 
            g.sequence_number,
            v_latest_game_sequence - g.sequence_number as games_ago,
            gr.status
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        WHERE gr.player_id = p_player_id
        AND g.completed = true
        AND g.is_historical = true
        ORDER BY g.sequence_number DESC
        LIMIT 40
    )
    SELECT 
        SUM(
            CASE 
                WHEN status = 'selected' THEN
                    CASE
                        WHEN games_ago = 0 THEN 20
                        WHEN games_ago BETWEEN 1 AND 2 THEN 18
                        WHEN games_ago BETWEEN 3 AND 4 THEN 16
                        WHEN games_ago BETWEEN 5 AND 9 THEN 14
                        WHEN games_ago BETWEEN 10 AND 19 THEN 12
                        WHEN games_ago BETWEEN 20 AND 29 THEN 10
                        WHEN games_ago BETWEEN 30 AND 39 THEN 5
                        ELSE 0
                    END
                WHEN status = 'reserve' THEN 5
                ELSE 0
            END
        )
    INTO v_base_xp
    FROM player_games;

    -- Get reserve XP (only counting positive transactions, as reserve appearances are already in v_base_xp)
    SELECT COALESCE(SUM(xp_amount), 0)
    INTO v_reserve_xp
    FROM reserve_xp_transactions
    WHERE player_id = p_player_id AND xp_amount > 0;

    -- Add reserve XP to base XP before applying modifiers
    v_total_base_xp := v_base_xp + v_reserve_xp;

    -- Get current streak and bench warmer streak
    SELECT current_streak, bench_warmer_streak
    INTO v_current_streak, v_bench_warmer_streak
    FROM players
    WHERE id = p_player_id;

    -- Calculate streak modifier (each streak level adds 10%)
    v_streak_modifier := 1 + (COALESCE(v_current_streak, 0) * 0.1);

    -- Calculate bench warmer modifier (5% per level)
    v_bench_warmer_modifier := 1 + (COALESCE(v_bench_warmer_streak, 0) * 0.05);

    -- Get unpaid games count (excluding reserve games)
    SELECT COUNT(*)
    INTO v_unpaid_games_count
    FROM player_unpaid_games_view
    WHERE player_id = p_player_id;

    -- Calculate unpaid games modifier (50% reduction per unpaid game)
    v_unpaid_games_modifier := GREATEST(0, (1 - (v_unpaid_games_count * 0.5)));

    -- Apply modifiers
    v_final_xp := ROUND(
        v_total_base_xp * 
        v_streak_modifier * 
        v_bench_warmer_modifier *
        v_unpaid_games_modifier
    );

    -- Debug logging
    RAISE NOTICE 'Player: %, Base XP: %, Reserve XP: %, Total Base: %, Streak Mult: %, Bench: %, Unpaid: %, Final: %',
        (SELECT friendly_name FROM players WHERE id = p_player_id),
        v_base_xp,
        v_reserve_xp,
        v_total_base_xp,
        v_streak_modifier,
        v_bench_warmer_modifier,
        v_unpaid_games_modifier,
        v_final_xp;

    RETURN v_final_xp;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to explain the changes made in this function
COMMENT ON FUNCTION calculate_player_xp(UUID) IS 'Calculates player XP based on game history, streaks, and penalties, including reserve XP';