-- =====================================================
-- Fix XP Calculation to Use Frozen Streak Modifier
-- =====================================================
-- This migration updates calculate_player_xp to use frozen_streak_modifier
-- when a player has an active shield, ensuring their XP bonus remains
-- consistent even when not playing

CREATE OR REPLACE FUNCTION public.calculate_player_xp(p_player_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_base_xp integer;
    v_streak_modifier decimal;
    v_reserve_modifier decimal;
    v_registration_modifier decimal;
    v_unpaid_games_modifier decimal;
    v_total_modifier decimal;
    v_reserve_xp integer;
    v_final_xp integer;
    v_latest_game_number integer;
BEGIN
    -- Get the latest game number from ALL games
    SELECT MAX(sequence_number) INTO v_latest_game_number FROM games WHERE completed = true;

    -- Calculate base XP from game participation (only for selected players)
    WITH player_games AS (
        SELECT
            g.id,
            g.sequence_number,
            gr.status,
            (v_latest_game_number - g.sequence_number) as games_ago
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        WHERE gr.player_id = p_player_id
        AND g.completed = true
        AND gr.status = 'selected'
        ORDER BY g.sequence_number DESC
    ),
    game_weights AS (
        SELECT
            id,
            sequence_number,
            games_ago,
            CASE
                WHEN games_ago = 0 THEN 20
                WHEN games_ago BETWEEN 1 AND 2 THEN 18
                WHEN games_ago BETWEEN 3 AND 4 THEN 16
                WHEN games_ago BETWEEN 5 AND 9 THEN 14
                WHEN games_ago BETWEEN 10 AND 19 THEN 12
                WHEN games_ago BETWEEN 20 AND 29 THEN 10
                WHEN games_ago BETWEEN 30 AND 39 THEN 5
                ELSE 0
            END as weight
        FROM player_games
    )
    SELECT COALESCE(SUM(weight), 0)
    INTO v_base_xp
    FROM game_weights;

    -- Calculate reserve XP (5 XP per reserve game, excluding late reserves)
    SELECT COUNT(*) * 5
    INTO v_reserve_xp
    FROM game_registrations gr
    JOIN games g ON g.id = gr.game_id
    WHERE gr.player_id = p_player_id
    AND gr.status = 'reserve'
    AND g.completed = true
    AND (gr.late_reserve = false OR gr.late_reserve IS NULL);  -- Only count non-late reserves

    -- Add reserve XP to base XP before multipliers
    v_base_xp := v_base_xp + v_reserve_xp;

    -- Get streak modifier (+10% per streak level)
    -- *** SHIELD TOKEN INTEGRATION ***
    -- If player has active shield, use frozen_streak_modifier
    -- Otherwise calculate from current_streak
    SELECT COALESCE(
        CASE
            WHEN shield_active = true AND frozen_streak_modifier IS NOT NULL
            THEN frozen_streak_modifier
            ELSE current_streak * 0.1
        END,
        0
    )
    INTO v_streak_modifier
    FROM players
    WHERE id = p_player_id;

    -- Get reserve modifier (+5% only if reserve in most recent game and not a late reserve)
    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM game_registrations gr
                JOIN games g ON g.id = gr.game_id
                WHERE gr.player_id = p_player_id
                AND g.sequence_number = v_latest_game_number
                AND gr.status = 'reserve'
                AND (gr.late_reserve = false OR gr.late_reserve IS NULL)  -- Only count non-late reserves
            ) THEN 0.05
            ELSE 0
        END
    INTO v_reserve_modifier;

    -- Get registration streak modifier (+2.5% per streak if bonus applies)
    SELECT COALESCE(
        CASE
            WHEN bonus_applies THEN current_streak_length * 0.025
            ELSE 0
        END,
        0
    )
    INTO v_registration_modifier
    FROM players p
    LEFT JOIN player_current_registration_streak_bonus rs ON rs.friendly_name = p.friendly_name
    WHERE p.id = p_player_id;

    -- Calculate unpaid games modifier (-50% per unpaid game, excluding dropped out games)
    WITH unpaid_games AS (
        SELECT COUNT(*) as unpaid_count
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        WHERE gr.player_id = p_player_id
        AND gr.paid = false
        AND g.completed = true
        AND gr.status = 'selected'
        AND gr.status != 'dropped_out'  -- Don't count unpaid games if player dropped out
        AND date_trunc('day', g.date + INTERVAL '1 day') <= date_trunc('day', NOW())
    )
    SELECT COALESCE(unpaid_count * -0.5, 0)
    INTO v_unpaid_games_modifier
    FROM unpaid_games;

    -- Calculate total modifier by combining all modifiers first
    v_total_modifier := 1 + v_streak_modifier + v_reserve_modifier + v_registration_modifier + v_unpaid_games_modifier;

    -- Calculate final XP and ensure it's never negative
    v_final_xp := GREATEST(0, ROUND(v_base_xp * v_total_modifier));

    RETURN v_final_xp;
END;
$function$;

COMMENT ON FUNCTION calculate_player_xp IS 'Calculates total XP for a player including shield token frozen streak modifier support';

-- =====================================================
-- Migration Complete
-- =====================================================
