-- =====================================================
-- Shield Token Gradual Decay System Migration
-- =====================================================
-- Changes shield tokens from "full freeze" to "gradual decay" where:
-- - Protected bonus = protected_streak_value - current_streak
-- - Effective streak = MAX(current_streak, protected_streak_value - current_streak)
-- - Shield removed at convergence (when natural streak >= protected_streak_value / 2)
--
-- Multi-shield behavior: Decay only starts when player returns and plays
-- (decay is "paused" while actively using shields each week)

-- =====================================================
-- 1. Rename columns in players table
-- =====================================================

ALTER TABLE players RENAME COLUMN frozen_streak_value TO protected_streak_value;
ALTER TABLE players RENAME COLUMN frozen_streak_modifier TO protected_streak_base;

COMMENT ON COLUMN players.protected_streak_value IS 'The original streak value when shield was activated (used for gradual decay calculation)';
COMMENT ON COLUMN players.protected_streak_base IS 'The original streak value stored for reference (same as protected_streak_value)';

-- =====================================================
-- 2. Rename columns in shield_token_usage table
-- =====================================================

ALTER TABLE shield_token_usage RENAME COLUMN frozen_streak_value TO protected_streak_value;
ALTER TABLE shield_token_usage RENAME COLUMN frozen_streak_modifier TO protected_streak_base;

-- =====================================================
-- 3. Rename columns in shield_token_history table
-- =====================================================

ALTER TABLE shield_token_history RENAME COLUMN frozen_streak_value TO protected_streak_value;
ALTER TABLE shield_token_history RENAME COLUMN frozen_streak_modifier TO protected_streak_base;

-- =====================================================
-- 4. Update calculate_player_xp function with gradual decay
-- =====================================================

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
    v_current_streak integer;
    v_protected_streak_value integer;
    v_decaying_protected integer;
    v_effective_streak integer;
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
    AND (gr.late_reserve = false OR gr.late_reserve IS NULL);

    -- Add reserve XP to base XP before multipliers
    v_base_xp := v_base_xp + v_reserve_xp;

    -- Get streak modifier (+10% per streak level)
    -- *** SHIELD TOKEN GRADUAL DECAY ***
    -- If player has active shield, calculate decaying protected bonus:
    -- Decaying protected = protected_streak_value - current_streak
    -- Effective streak = MAX(current_streak, decaying protected)
    SELECT
        COALESCE(current_streak, 0),
        protected_streak_value,
        shield_active
    INTO v_current_streak, v_protected_streak_value, v_streak_modifier
    FROM players
    WHERE id = p_player_id;

    -- Calculate effective streak based on shield status
    IF v_streak_modifier = true AND v_protected_streak_value IS NOT NULL THEN
        -- Gradual decay formula
        v_decaying_protected := v_protected_streak_value - v_current_streak;
        v_effective_streak := GREATEST(v_current_streak, v_decaying_protected);
        v_streak_modifier := v_effective_streak * 0.1;
    ELSE
        -- No shield - use natural streak
        v_streak_modifier := v_current_streak * 0.1;
    END IF;

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
                AND (gr.late_reserve = false OR gr.late_reserve IS NULL)
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
        AND gr.status != 'dropped_out'
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

COMMENT ON FUNCTION calculate_player_xp IS 'Calculates total XP for a player with gradual decay shield protection (effective streak = MAX(natural, protected - natural))';

-- =====================================================
-- 5. Update use_shield_token function
-- =====================================================

CREATE OR REPLACE FUNCTION use_shield_token(
    p_player_id UUID,
    p_game_id UUID,
    p_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    tokens_remaining INTEGER
) AS $$
DECLARE
    v_tokens_before INTEGER;
    v_tokens_after INTEGER;
    v_current_streak INTEGER;
    v_is_eligible BOOLEAN;
    v_eligibility_reason TEXT;
    v_was_registered BOOLEAN;
    v_shield_already_active BOOLEAN;
    v_existing_protected_value INTEGER;
    v_new_protected_value INTEGER;
BEGIN
    -- Check eligibility
    SELECT eligible, reason INTO v_is_eligible, v_eligibility_reason
    FROM check_shield_eligibility(p_player_id, p_game_id);

    IF NOT v_is_eligible AND v_eligibility_reason != 'Can cancel registration and use shield' THEN
        RETURN QUERY SELECT false, v_eligibility_reason, 0;
        RETURN;
    END IF;

    -- Delete any inactive shield usage records for this player/game (prevents duplicate key constraint)
    DELETE FROM shield_token_usage
    WHERE player_id = p_player_id AND game_id = p_game_id AND is_active = false;

    -- Get player's current data including existing shield state
    SELECT shield_tokens_available, current_streak, shield_active, protected_streak_value
    INTO v_tokens_before, v_current_streak, v_shield_already_active, v_existing_protected_value
    FROM players
    WHERE id = p_player_id;

    -- Calculate new protected value
    -- If shield is already active with decay in progress, preserve the effective streak
    -- Effective streak = MAX(natural, protected - natural)
    IF v_shield_already_active AND v_existing_protected_value IS NOT NULL THEN
        -- Preserve effective streak during active decay
        v_new_protected_value := GREATEST(
            v_current_streak,
            v_existing_protected_value - v_current_streak
        );
    ELSE
        -- Fresh shield - use current natural streak
        v_new_protected_value := v_current_streak;
    END IF;

    -- If player was registered, remove their registration
    SELECT EXISTS(
        SELECT 1 FROM game_registrations
        WHERE player_id = p_player_id AND game_id = p_game_id
    ) INTO v_was_registered;

    IF v_was_registered THEN
        DELETE FROM game_registrations
        WHERE player_id = p_player_id AND game_id = p_game_id;
    END IF;

    -- Update player's shield status
    -- Store protected_streak_value as the effective streak (used for gradual decay calculation)
    -- protected_streak_base stores the same value for reference
    UPDATE players
    SET
        shield_tokens_available = shield_tokens_available - 1,
        shield_active = true,
        protected_streak_value = v_new_protected_value,
        protected_streak_base = v_new_protected_value
    WHERE id = p_player_id
    RETURNING shield_tokens_available INTO v_tokens_after;

    -- Create shield usage record
    INSERT INTO shield_token_usage (
        player_id,
        game_id,
        protected_streak_value,
        protected_streak_base
    ) VALUES (
        p_player_id,
        p_game_id,
        v_new_protected_value,
        v_new_protected_value
    );

    -- Log in history
    INSERT INTO shield_token_history (
        player_id,
        action_type,
        game_id,
        tokens_before,
        tokens_after,
        protected_streak_value,
        protected_streak_base,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'used',
        p_game_id,
        v_tokens_before,
        v_tokens_after,
        v_new_protected_value,
        v_new_protected_value,
        CASE
            WHEN v_shield_already_active THEN
                format('Shield used during decay (preserved effective streak %s from natural %s)', v_new_protected_value, v_current_streak)
            WHEN v_was_registered THEN
                'Registration cancelled, shield used'
            ELSE
                'Shield used'
        END,
        COALESCE(p_user_id, 'player')
    );

    RETURN QUERY SELECT true, 'Shield token used successfully'::TEXT, v_tokens_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION use_shield_token IS 'Uses a shield token for a specific game. If shield is already active (intermittent absences), preserves effective streak = MAX(natural, protected - natural). Otherwise uses current natural streak.';

-- =====================================================
-- 6. Update remove_shield_protection function
-- =====================================================

CREATE OR REPLACE FUNCTION remove_shield_protection(
    p_player_id UUID,
    p_reason TEXT DEFAULT 'Natural streak reached',
    p_admin_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_was_active BOOLEAN;
    v_protected_streak INTEGER;
    v_protected_base DECIMAL(5,2);
BEGIN
    -- Get current shield status
    SELECT shield_active, protected_streak_value, protected_streak_base
    INTO v_was_active, v_protected_streak, v_protected_base
    FROM players
    WHERE id = p_player_id;

    IF NOT v_was_active THEN
        RETURN QUERY SELECT false, 'No active shield to remove'::TEXT;
        RETURN;
    END IF;

    -- Remove shield protection
    UPDATE players
    SET
        shield_active = false,
        protected_streak_value = NULL,
        protected_streak_base = NULL
    WHERE id = p_player_id;

    -- Mark all active shield usages as inactive
    UPDATE shield_token_usage
    SET
        is_active = false,
        removed_at = CURRENT_TIMESTAMP,
        removal_reason = p_reason
    WHERE player_id = p_player_id AND is_active = true;

    -- Log in history
    INSERT INTO shield_token_history (
        player_id,
        action_type,
        tokens_before,
        tokens_after,
        protected_streak_value,
        protected_streak_base,
        notes,
        initiated_by
    ) SELECT
        p_player_id,
        'removed',
        shield_tokens_available,
        shield_tokens_available,
        v_protected_streak,
        v_protected_base,
        p_reason,
        COALESCE(p_admin_id, 'system')
    FROM players WHERE id = p_player_id;

    RETURN QUERY SELECT true, 'Shield protection removed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_shield_protection IS 'Removes active shield protection from a player, called when streak converges or broken';

-- =====================================================
-- 7. Update process_shield_streak_protection function
-- =====================================================

CREATE OR REPLACE FUNCTION process_shield_streak_protection(p_game_id UUID)
RETURNS TABLE (
    player_id UUID,
    action_taken TEXT,
    details TEXT
) AS $$
DECLARE
    v_player RECORD;
    v_protected_streak INTEGER;
    v_current_streak INTEGER;
    v_convergence_point INTEGER;
    v_decaying_protected INTEGER;
BEGIN
    -- Process all players with active shields
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
    LOOP
        v_protected_streak := v_player.protected_streak_value;
        v_current_streak := v_player.current_streak;

        -- Calculate convergence point (ceiling of protected/2)
        v_convergence_point := CEIL(v_protected_streak::NUMERIC / 2);

        -- Calculate current decaying protected value
        v_decaying_protected := v_protected_streak - v_current_streak;

        -- Shield removed when natural streak >= convergence point (where they meet in the middle)
        -- This is when: current_streak >= protected_streak / 2
        IF v_current_streak >= v_convergence_point THEN
            -- Remove shield protection - they've converged
            PERFORM remove_shield_protection(
                v_player.id,
                format('Streak converged: natural %s >= convergence point %s (protected was %s)',
                       v_current_streak, v_convergence_point, v_protected_streak)
            );

            RETURN QUERY SELECT
                v_player.id,
                'shield_removed'::TEXT,
                format('Natural streak %s reached convergence point %s (protected was %s, effective bonus now +%s%%)',
                       v_current_streak, v_convergence_point, v_protected_streak, v_current_streak * 10)::TEXT;
        ELSE
            -- Shield remains active with gradual decay
            RETURN QUERY SELECT
                v_player.id,
                'shield_maintained'::TEXT,
                format('Protected streak %s decaying (current: natural %s, protected bonus %s, effective +%s%%)',
                       v_protected_streak, v_current_streak, v_decaying_protected,
                       GREATEST(v_current_streak, v_decaying_protected) * 10)::TEXT;
        END IF;
    END LOOP;

    -- Check for players who missed this game without a shield
    FOR v_player IN
        SELECT
            p.id,
            p.friendly_name,
            p.shield_active,
            p.current_streak
        FROM players p
        WHERE p.shield_active = true
        AND NOT EXISTS (
            SELECT 1 FROM game_registrations gr
            WHERE gr.player_id = p.id AND gr.game_id = p_game_id AND gr.status = 'selected'
        )
        AND NOT EXISTS (
            SELECT 1 FROM shield_token_usage stu
            WHERE stu.player_id = p.id AND stu.game_id = p_game_id AND stu.is_active = true
        )
    LOOP
        -- Player had active shield but missed game without using another shield - break streak
        PERFORM remove_shield_protection(
            v_player.id,
            'Missed game without using shield - protection lost'
        );

        RETURN QUERY SELECT
            v_player.id,
            'shield_broken'::TEXT,
            'Missed game during protection period without shield - streak reset to 0'::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_shield_streak_protection IS 'Processes gradual decay shield protection after game selection, removes shields at convergence point or when broken';

-- =====================================================
-- 8. Update return_shield_token function
-- =====================================================

CREATE OR REPLACE FUNCTION return_shield_token(
    p_player_id UUID,
    p_game_id UUID,
    p_reason TEXT DEFAULT 'Game cancelled or player manually selected'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    tokens_now INTEGER
) AS $$
DECLARE
    v_tokens_before INTEGER;
    v_tokens_after INTEGER;
    v_shield_was_used BOOLEAN;
    v_has_other_active_shields BOOLEAN;
BEGIN
    -- Check if shield was actually used for this game
    SELECT EXISTS(
        SELECT 1 FROM shield_token_usage
        WHERE player_id = p_player_id AND game_id = p_game_id
    ) INTO v_shield_was_used;

    IF NOT v_shield_was_used THEN
        RETURN QUERY SELECT false, 'No shield used for this game'::TEXT, 0;
        RETURN;
    END IF;

    -- Get current token count
    SELECT shield_tokens_available INTO v_tokens_before
    FROM players
    WHERE id = p_player_id;

    -- Don't exceed max capacity
    IF v_tokens_before >= 4 THEN
        -- Just mark the usage as inactive without returning token
        UPDATE shield_token_usage
        SET is_active = false, removed_at = CURRENT_TIMESTAMP, removal_reason = p_reason
        WHERE player_id = p_player_id AND game_id = p_game_id;

        RETURN QUERY SELECT true, 'Shield usage cancelled (already at max tokens)'::TEXT, v_tokens_before;
        RETURN;
    END IF;

    -- Return the token
    UPDATE players
    SET shield_tokens_available = shield_tokens_available + 1
    WHERE id = p_player_id
    RETURNING shield_tokens_available INTO v_tokens_after;

    -- Mark shield usage as inactive
    UPDATE shield_token_usage
    SET
        is_active = false,
        removed_at = CURRENT_TIMESTAMP,
        removal_reason = p_reason
    WHERE player_id = p_player_id AND game_id = p_game_id;

    -- Check if there are other active shields for this player
    SELECT EXISTS(
        SELECT 1 FROM shield_token_usage
        WHERE player_id = p_player_id AND is_active = true
    ) INTO v_has_other_active_shields;

    -- If no other active shields, clear shield protection
    IF NOT v_has_other_active_shields THEN
        UPDATE players
        SET
            shield_active = false,
            protected_streak_value = NULL,
            protected_streak_base = NULL
        WHERE id = p_player_id;
    END IF;

    -- Log in history
    INSERT INTO shield_token_history (
        player_id,
        action_type,
        game_id,
        tokens_before,
        tokens_after,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'returned',
        p_game_id,
        v_tokens_before,
        v_tokens_after,
        p_reason,
        'system'
    );

    RETURN QUERY SELECT true, 'Shield token returned'::TEXT, v_tokens_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION return_shield_token IS 'Returns a shield token to a player when game is cancelled or player is manually selected';

-- =====================================================
-- 9. Update materialized view
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS player_shield_status;

CREATE MATERIALIZED VIEW player_shield_status AS
SELECT
    p.id as player_id,
    p.friendly_name,
    p.shield_tokens_available,
    p.games_played_since_shield_launch,
    p.shield_active,
    p.protected_streak_value,
    p.protected_streak_base,
    p.current_streak,
    -- Gradual decay calculations
    CASE
        WHEN p.shield_active AND p.protected_streak_value IS NOT NULL
        THEN p.protected_streak_value - p.current_streak
        ELSE NULL
    END as decaying_protected_bonus,
    CASE
        WHEN p.shield_active AND p.protected_streak_value IS NOT NULL
        THEN GREATEST(p.current_streak, p.protected_streak_value - p.current_streak)
        ELSE p.current_streak
    END as effective_streak,
    CASE
        WHEN p.shield_active AND p.protected_streak_value IS NOT NULL
        THEN CEIL(p.protected_streak_value::NUMERIC / 2)
        ELSE NULL
    END as convergence_point,
    -- Progress to next token
    (p.games_played_since_shield_launch % 10) as games_toward_next_token,
    (10 - (p.games_played_since_shield_launch % 10)) as games_until_next_token,
    -- Active shield usage
    (
        SELECT array_agg(
            json_build_object(
                'game_id', stu.game_id,
                'used_at', stu.used_at,
                'protected_streak', stu.protected_streak_value
            )
        )
        FROM shield_token_usage stu
        WHERE stu.player_id = p.id AND stu.is_active = true
    ) as active_shields,
    -- Recent history
    (
        SELECT array_agg(
            json_build_object(
                'action', sth.action_type,
                'game_id', sth.game_id,
                'created_at', sth.created_at,
                'notes', sth.notes
            ) ORDER BY sth.created_at DESC
        )
        FROM shield_token_history sth
        WHERE sth.player_id = p.id
        LIMIT 5
    ) as recent_history
FROM players p;

CREATE UNIQUE INDEX idx_player_shield_status_player_id ON player_shield_status(player_id);

COMMENT ON MATERIALIZED VIEW player_shield_status IS 'Aggregated view of player shield token status with gradual decay calculations';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary of changes:
-- 1. Renamed frozen_* columns to protected_* across all tables
-- 2. Updated calculate_player_xp to use gradual decay formula:
--    effective_streak = MAX(current_streak, protected_streak_value - current_streak)
-- 3. Updated process_shield_streak_protection to remove at convergence point
--    (when current_streak >= ceil(protected_streak_value / 2))
-- 4. Updated return_shield_token to clear shield protection when no active shields
-- 5. Updated materialized view with new decay calculations
-- 6. Fixed use_shield_token to handle intermittent absences:
--    - If shield already active during decay, preserves effective streak
--    - Prevents losing decay benefit when using shield mid-recovery
--    - Example: protected=10, natural=2 -> new shield protects 8 (not 2!)
