-- =====================================================
-- Fix Shield Convergence Timing Bug
-- =====================================================
-- The process_shield_streak_protection function was incorrectly
-- checking convergence for shields used for the CURRENT game.
--
-- Bug: Player uses shield for game X, registration closes,
-- convergence check runs and removes shield immediately because
-- current_streak >= convergence_point (they haven't missed game yet!)
--
-- Fix: Skip convergence check for players who used shield for THIS game.
-- Only evaluate convergence for shields from PREVIOUS games where
-- player has returned and is playing again.

CREATE OR REPLACE FUNCTION process_shield_streak_protection(p_game_id uuid)
RETURNS TABLE(player_id uuid, action_taken text, details text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_player RECORD;
    v_protected_streak INTEGER;
    v_current_streak INTEGER;
    v_convergence_point INTEGER;
    v_decaying_protected INTEGER;
    v_shield_game_id UUID;
BEGIN
    -- Process players with active shields who used their shield for a PREVIOUS game
    -- (NOT this current game - they haven't missed it yet!)
    FOR v_player IN
        SELECT
            p.id,
            p.friendly_name,
            p.shield_active,
            p.protected_streak_value,
            p.current_streak,
            stu.game_id as shield_game_id
        FROM players p
        LEFT JOIN shield_token_usage stu ON p.id = stu.player_id AND stu.is_active = true
        WHERE p.shield_active = true
        -- CRITICAL FIX: Only evaluate shields from PREVIOUS games
        -- Skip if player's active shield is for THIS game (p_game_id)
        AND (stu.game_id IS NULL OR stu.game_id != p_game_id)
    LOOP
        v_protected_streak := v_player.protected_streak_value;
        v_current_streak := v_player.current_streak;

        -- Calculate convergence point (ceiling of protected/2)
        v_convergence_point := CEIL(v_protected_streak::NUMERIC / 2);

        -- Calculate current decaying protected value
        v_decaying_protected := v_protected_streak - v_current_streak;

        -- Shield removed when natural streak >= convergence point
        -- This only applies to players who have RETURNED and are playing again
        IF v_current_streak >= v_convergence_point THEN
            PERFORM remove_shield_protection(
                v_player.id,
                format('Streak converged: natural %s >= convergence point %s (protected was %s)',
                       v_current_streak, v_convergence_point, v_protected_streak)
            );

            RETURN QUERY SELECT
                v_player.id,
                'shield_removed'::TEXT,
                format('Natural streak %s reached convergence point %s (protected was %s)',
                       v_current_streak, v_convergence_point, v_protected_streak)::TEXT;
        ELSE
            RETURN QUERY SELECT
                v_player.id,
                'shield_maintained'::TEXT,
                format('Protected streak %s decaying (current: natural %s, protected bonus %s, effective +%s%%)',
                       v_protected_streak, v_current_streak, v_decaying_protected,
                       GREATEST(v_current_streak, v_decaying_protected) * 10)::TEXT;
        END IF;
    END LOOP;

    -- Check for players who had a shield from a PREVIOUS game but missed THIS game
    -- without using another shield - their protection is lost
    FOR v_player IN
        SELECT
            p.id,
            p.friendly_name,
            p.shield_active,
            p.current_streak,
            stu.game_id as original_shield_game_id
        FROM players p
        LEFT JOIN shield_token_usage stu ON p.id = stu.player_id AND stu.is_active = true
        WHERE p.shield_active = true
        -- Shield was for a PREVIOUS game (not this one)
        AND (stu.game_id IS NULL OR stu.game_id != p_game_id)
        -- Player was NOT selected for this game
        AND NOT EXISTS (
            SELECT 1 FROM game_registrations gr
            WHERE gr.player_id = p.id AND gr.game_id = p_game_id AND gr.status = 'selected'
        )
        -- Player did NOT use a NEW shield for this game
        AND NOT EXISTS (
            SELECT 1 FROM shield_token_usage stu2
            WHERE stu2.player_id = p.id AND stu2.game_id = p_game_id AND stu2.is_active = true
        )
    LOOP
        PERFORM remove_shield_protection(
            v_player.id,
            'Missed game during protection period without using another shield'
        );

        RETURN QUERY SELECT
            v_player.id,
            'shield_broken'::TEXT,
            'Missed game during protection period without shield - protection lost'::TEXT;
    END LOOP;

    -- Players who used their shield for THIS game are NOT processed here
    -- Their shield status is simply maintained - convergence starts NEXT game
    FOR v_player IN
        SELECT
            p.id,
            p.friendly_name,
            p.protected_streak_value,
            stu.game_id
        FROM players p
        JOIN shield_token_usage stu ON p.id = stu.player_id AND stu.is_active = true
        WHERE p.shield_active = true
        AND stu.game_id = p_game_id
    LOOP
        RETURN QUERY SELECT
            v_player.id,
            'shield_active_for_this_game'::TEXT,
            format('Shield used for this game - protecting %s game streak. Decay starts next game.',
                   v_player.protected_streak_value)::TEXT;
    END LOOP;
END;
$function$;

COMMENT ON FUNCTION process_shield_streak_protection IS 'Processes shield protection after game completion. Fixed: no longer evaluates convergence for shields used for the current game.';
