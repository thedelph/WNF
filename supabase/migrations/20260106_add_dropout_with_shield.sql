-- =====================================================
-- Dropout with Shield Protection Migration
-- =====================================================
-- This migration adds:
-- 1. dropout_with_shield() - Drop out a player with optional shield protection
-- 2. remove_shield_tokens() - Admin function to remove tokens from a player
-- 3. reset_shield_progress() - Admin function to reset games_played counter

-- =====================================================
-- 1. Function: dropout_with_shield
-- =====================================================
-- Handles player dropout with optional shield token protection.
-- Can be called by admins (with p_admin_id) or by players themselves.
-- If p_use_shield is true and player has tokens, uses shield and marks as dropped_out.
-- If p_use_shield is false, just marks as dropped_out (streak will break).

CREATE OR REPLACE FUNCTION dropout_with_shield(
    p_player_id UUID,
    p_game_id UUID,
    p_use_shield BOOLEAN DEFAULT false,
    p_admin_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_registration_id UUID;
    v_current_status TEXT;
    v_tokens_available INTEGER;
    v_current_streak INTEGER;
    v_is_game_day BOOLEAN;
    v_game_date DATE;
    v_result JSON;
BEGIN
    -- Check if player has a registration for this game
    SELECT id, status
    INTO v_registration_id, v_current_status
    FROM game_registrations
    WHERE player_id = p_player_id AND game_id = p_game_id;

    IF v_registration_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Player is not registered for this game'
        );
    END IF;

    -- Check if already dropped out
    IF v_current_status = 'dropped_out' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Player has already dropped out of this game'
        );
    END IF;

    -- Get player's current data
    SELECT shield_tokens_available, current_streak
    INTO v_tokens_available, v_current_streak
    FROM players
    WHERE id = p_player_id;

    -- Get game date for game-day determination
    SELECT DATE(date) INTO v_game_date FROM games WHERE id = p_game_id;
    v_is_game_day := (v_game_date = CURRENT_DATE);

    -- Handle shield usage
    IF p_use_shield THEN
        -- Check if player has shield tokens
        IF v_tokens_available <= 0 THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Player has no shield tokens available'
            );
        END IF;

        -- Use the shield token (this protects the streak)
        -- The use_shield_token function handles:
        -- - Decrementing token count
        -- - Setting shield_active = true
        -- - Storing protected_streak_value
        -- - Logging to shield_token_history
        -- Note: use_shield_token deletes the registration, but we want to mark as dropped_out
        -- So we handle it manually here

        -- Update player's shield status
        UPDATE players
        SET
            shield_tokens_available = shield_tokens_available - 1,
            shield_active = true,
            protected_streak_value = v_current_streak,
            protected_streak_base = v_current_streak
        WHERE id = p_player_id;

        -- Create shield usage record
        INSERT INTO shield_token_usage (
            player_id,
            game_id,
            protected_streak_value,
            protected_streak_base
        ) VALUES (
            p_player_id,
            p_game_id,
            v_current_streak,
            v_current_streak
        )
        ON CONFLICT (player_id, game_id) DO UPDATE SET
            is_active = true,
            used_at = CURRENT_TIMESTAMP,
            protected_streak_value = v_current_streak,
            protected_streak_base = v_current_streak,
            removed_at = NULL,
            removal_reason = NULL;

        -- Log in shield history
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
            v_tokens_available,
            v_tokens_available - 1,
            v_current_streak,
            v_current_streak,
            CASE
                WHEN p_admin_id IS NOT NULL THEN 'Dropout with shield (admin action)'
                ELSE 'Dropout with shield (player action)'
            END,
            COALESCE(p_admin_id, 'player')
        );
    END IF;

    -- Update registration status to dropped_out
    UPDATE game_registrations
    SET status = 'dropped_out'
    WHERE id = v_registration_id;

    -- Record status change for audit
    INSERT INTO player_status_changes (
        player_id,
        game_id,
        from_status,
        to_status,
        change_type,
        is_game_day,
        notes
    ) VALUES (
        p_player_id,
        p_game_id,
        v_current_status,
        'dropped_out',
        'dropout',
        v_is_game_day,
        CASE
            WHEN p_use_shield THEN 'Dropout with shield protection'
            WHEN p_admin_id IS NOT NULL THEN 'Dropout by admin'
            ELSE 'Voluntary dropout'
        END
    );

    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', CASE
            WHEN p_use_shield THEN 'Dropped out with shield protection - streak preserved'
            ELSE 'Dropped out - streak will reset when game completes'
        END,
        'used_shield', p_use_shield,
        'tokens_remaining', CASE
            WHEN p_use_shield THEN v_tokens_available - 1
            ELSE v_tokens_available
        END,
        'was_game_day', v_is_game_day
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION dropout_with_shield IS 'Handles player dropout with optional shield token protection for streak preservation';

-- =====================================================
-- 2. Function: remove_shield_tokens (Admin only)
-- =====================================================
-- Removes a specified number of shield tokens from a player.
-- Used by admins for corrections or policy enforcement.

CREATE OR REPLACE FUNCTION remove_shield_tokens(
    p_player_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'Admin removal',
    p_admin_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_tokens_before INTEGER;
    v_tokens_after INTEGER;
    v_actual_removal INTEGER;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Amount must be positive'
        );
    END IF;

    -- Get current token count
    SELECT shield_tokens_available
    INTO v_tokens_before
    FROM players
    WHERE id = p_player_id;

    IF v_tokens_before IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Player not found'
        );
    END IF;

    -- Calculate actual removal (can't go below 0)
    v_actual_removal := LEAST(p_amount, v_tokens_before);
    v_tokens_after := v_tokens_before - v_actual_removal;

    IF v_actual_removal = 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Player has no tokens to remove'
        );
    END IF;

    -- Update player's token count
    UPDATE players
    SET shield_tokens_available = v_tokens_after
    WHERE id = p_player_id;

    -- Log in history
    INSERT INTO shield_token_history (
        player_id,
        action_type,
        tokens_before,
        tokens_after,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'admin_override',
        v_tokens_before,
        v_tokens_after,
        format('Removed %s token(s): %s', v_actual_removal, p_reason),
        COALESCE(p_admin_id, 'admin')
    );

    RETURN json_build_object(
        'success', true,
        'message', format('Removed %s shield token(s)', v_actual_removal),
        'tokens_before', v_tokens_before,
        'tokens_after', v_tokens_after,
        'tokens_removed', v_actual_removal
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_shield_tokens IS 'Admin function to remove shield tokens from a player';

-- =====================================================
-- 3. Function: reset_shield_progress (Admin only)
-- =====================================================
-- Resets the games_played_since_shield_launch counter to 0.
-- Does NOT affect existing tokens - only progress toward next token.

CREATE OR REPLACE FUNCTION reset_shield_progress(
    p_player_id UUID,
    p_reason TEXT DEFAULT 'Admin reset',
    p_admin_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_games_before INTEGER;
    v_tokens_available INTEGER;
BEGIN
    -- Get current progress
    SELECT games_played_since_shield_launch, shield_tokens_available
    INTO v_games_before, v_tokens_available
    FROM players
    WHERE id = p_player_id;

    IF v_games_before IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Player not found'
        );
    END IF;

    -- Reset progress
    UPDATE players
    SET games_played_since_shield_launch = 0
    WHERE id = p_player_id;

    -- Log in history (using admin_override action type)
    INSERT INTO shield_token_history (
        player_id,
        action_type,
        tokens_before,
        tokens_after,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'admin_override',
        v_tokens_available,
        v_tokens_available,  -- Tokens unchanged
        format('Progress reset from %s games: %s', v_games_before, p_reason),
        COALESCE(p_admin_id, 'admin')
    );

    RETURN json_build_object(
        'success', true,
        'message', format('Reset progress from %s games to 0', v_games_before),
        'games_before', v_games_before,
        'games_after', 0,
        'tokens_unchanged', v_tokens_available
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_shield_progress IS 'Admin function to reset shield token progress (games_played counter) without affecting existing tokens';

-- =====================================================
-- Migration Complete
-- =====================================================
