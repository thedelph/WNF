-- =====================================================
-- Shield Token System Migration
-- =====================================================
-- This migration implements the shield token system for streak protection
-- Players earn 1 shield token per 10 games played (max 4 tokens)
-- Shield tokens protect their streak when they can't play
-- Frozen streak remains active until naturally reached again

-- =====================================================
-- 1. Add columns to players table
-- =====================================================

ALTER TABLE players
ADD COLUMN IF NOT EXISTS shield_tokens_available INTEGER DEFAULT 0 CHECK (shield_tokens_available >= 0 AND shield_tokens_available <= 4),
ADD COLUMN IF NOT EXISTS games_played_since_shield_launch INTEGER DEFAULT 0 CHECK (games_played_since_shield_launch >= 0),
ADD COLUMN IF NOT EXISTS shield_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS frozen_streak_value INTEGER,
ADD COLUMN IF NOT EXISTS frozen_streak_modifier DECIMAL(5,2);

-- Add comment for documentation
COMMENT ON COLUMN players.shield_tokens_available IS 'Number of shield tokens available (0-4), earned at every 10 games played';
COMMENT ON COLUMN players.games_played_since_shield_launch IS 'Count of games played since shield system launched, used for token accrual';
COMMENT ON COLUMN players.shield_active IS 'Whether player currently has an active shield protecting their streak';
COMMENT ON COLUMN players.frozen_streak_value IS 'The streak value (in games) frozen by the shield';
COMMENT ON COLUMN players.frozen_streak_modifier IS 'The XP modifier percentage frozen by the shield';

-- =====================================================
-- 2. Create shield_token_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS shield_token_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('issued', 'used', 'removed', 'returned', 'admin_override')),
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    tokens_before INTEGER NOT NULL,
    tokens_after INTEGER NOT NULL,
    frozen_streak_value INTEGER,
    frozen_streak_modifier DECIMAL(5,2),
    notes TEXT,
    initiated_by VARCHAR(100), -- 'system', 'player', or admin user_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for common queries
CREATE INDEX idx_shield_token_history_player ON shield_token_history(player_id);
CREATE INDEX idx_shield_token_history_game ON shield_token_history(game_id);
CREATE INDEX idx_shield_token_history_created_at ON shield_token_history(created_at DESC);

COMMENT ON TABLE shield_token_history IS 'Audit log of all shield token operations for transparency and debugging';

-- =====================================================
-- 3. Create shield_token_usage table
-- =====================================================

CREATE TABLE IF NOT EXISTS shield_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    frozen_streak_value INTEGER NOT NULL,
    frozen_streak_modifier DECIMAL(5,2) NOT NULL,
    removed_at TIMESTAMP WITH TIME ZONE,
    removal_reason VARCHAR(100),
    UNIQUE(player_id, game_id) -- One shield usage per player per game
);

-- Add indexes for common queries
CREATE INDEX idx_shield_token_usage_player ON shield_token_usage(player_id);
CREATE INDEX idx_shield_token_usage_game ON shield_token_usage(game_id);
CREATE INDEX idx_shield_token_usage_active ON shield_token_usage(is_active) WHERE is_active = true;

COMMENT ON TABLE shield_token_usage IS 'Tracks active shield usage per game, links shields to specific games';

-- =====================================================
-- 4. Function: check_shield_eligibility
-- =====================================================

CREATE OR REPLACE FUNCTION check_shield_eligibility(p_player_id UUID, p_game_id UUID)
RETURNS TABLE (
    eligible BOOLEAN,
    reason TEXT,
    tokens_available INTEGER
) AS $$
DECLARE
    v_tokens_available INTEGER;
    v_is_registered BOOLEAN;
    v_shield_already_used BOOLEAN;
BEGIN
    -- Get player's available tokens
    SELECT shield_tokens_available INTO v_tokens_available
    FROM players
    WHERE id = p_player_id;

    -- Check if player already registered for this game
    SELECT EXISTS(
        SELECT 1 FROM game_registrations
        WHERE player_id = p_player_id AND game_id = p_game_id
    ) INTO v_is_registered;

    -- Check if shield already used for this game
    SELECT EXISTS(
        SELECT 1 FROM shield_token_usage
        WHERE player_id = p_player_id AND game_id = p_game_id AND is_active = true
    ) INTO v_shield_already_used;

    -- Determine eligibility
    IF v_shield_already_used THEN
        RETURN QUERY SELECT false, 'Shield already used for this game'::TEXT, v_tokens_available;
    ELSIF v_tokens_available <= 0 THEN
        RETURN QUERY SELECT false, 'No shield tokens available'::TEXT, v_tokens_available;
    ELSIF v_is_registered THEN
        RETURN QUERY SELECT true, 'Can cancel registration and use shield'::TEXT, v_tokens_available;
    ELSE
        RETURN QUERY SELECT true, 'Eligible to use shield token'::TEXT, v_tokens_available;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_shield_eligibility IS 'Checks if a player can use a shield token for a specific game';

-- =====================================================
-- 5. Function: use_shield_token
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
    v_streak_modifier DECIMAL(5,2);
    v_is_eligible BOOLEAN;
    v_eligibility_reason TEXT;
    v_was_registered BOOLEAN;
BEGIN
    -- Check eligibility
    SELECT eligible, reason INTO v_is_eligible, v_eligibility_reason
    FROM check_shield_eligibility(p_player_id, p_game_id);

    IF NOT v_is_eligible AND v_eligibility_reason != 'Can cancel registration and use shield' THEN
        RETURN QUERY SELECT false, v_eligibility_reason, 0;
        RETURN;
    END IF;

    -- Get player's current data
    SELECT shield_tokens_available, current_streak
    INTO v_tokens_before, v_current_streak
    FROM players
    WHERE id = p_player_id;

    -- Calculate streak modifier (10% per game)
    v_streak_modifier := v_current_streak * 0.10;

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
    UPDATE players
    SET
        shield_tokens_available = shield_tokens_available - 1,
        shield_active = true,
        frozen_streak_value = v_current_streak,
        frozen_streak_modifier = v_streak_modifier
    WHERE id = p_player_id
    RETURNING shield_tokens_available INTO v_tokens_after;

    -- Create shield usage record
    INSERT INTO shield_token_usage (
        player_id,
        game_id,
        frozen_streak_value,
        frozen_streak_modifier
    ) VALUES (
        p_player_id,
        p_game_id,
        v_current_streak,
        v_streak_modifier
    );

    -- Log in history
    INSERT INTO shield_token_history (
        player_id,
        action_type,
        game_id,
        tokens_before,
        tokens_after,
        frozen_streak_value,
        frozen_streak_modifier,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'used',
        p_game_id,
        v_tokens_before,
        v_tokens_after,
        v_current_streak,
        v_streak_modifier,
        CASE WHEN v_was_registered THEN 'Registration cancelled, shield used' ELSE 'Shield used' END,
        COALESCE(p_user_id, 'player')
    );

    RETURN QUERY SELECT true, 'Shield token used successfully'::TEXT, v_tokens_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION use_shield_token IS 'Uses a shield token for a specific game, freezing the player''s current streak';

-- =====================================================
-- 6. Function: issue_shield_token
-- =====================================================

CREATE OR REPLACE FUNCTION issue_shield_token(
    p_player_id UUID,
    p_reason TEXT DEFAULT 'Milestone reached',
    p_admin_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    tokens_now INTEGER
) AS $$
DECLARE
    v_tokens_before INTEGER;
    v_tokens_after INTEGER;
    v_action_type VARCHAR(50);
BEGIN
    -- Get current token count
    SELECT shield_tokens_available INTO v_tokens_before
    FROM players
    WHERE id = p_player_id;

    -- Check if at max capacity
    IF v_tokens_before >= 4 THEN
        RETURN QUERY SELECT false, 'Player already has maximum tokens (4)'::TEXT, v_tokens_before;
        RETURN;
    END IF;

    -- Increment token count
    UPDATE players
    SET shield_tokens_available = shield_tokens_available + 1
    WHERE id = p_player_id
    RETURNING shield_tokens_available INTO v_tokens_after;

    -- Determine action type
    v_action_type := CASE WHEN p_admin_id IS NOT NULL THEN 'admin_override' ELSE 'issued' END;

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
        v_action_type,
        v_tokens_before,
        v_tokens_after,
        p_reason,
        COALESCE(p_admin_id, 'system')
    );

    RETURN QUERY SELECT true, 'Shield token issued successfully'::TEXT, v_tokens_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION issue_shield_token IS 'Issues a shield token to a player, used for milestone rewards or admin override';

-- =====================================================
-- 7. Function: remove_shield_protection
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
    v_frozen_streak INTEGER;
    v_frozen_modifier DECIMAL(5,2);
BEGIN
    -- Get current shield status
    SELECT shield_active, frozen_streak_value, frozen_streak_modifier
    INTO v_was_active, v_frozen_streak, v_frozen_modifier
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
        frozen_streak_value = NULL,
        frozen_streak_modifier = NULL
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
        frozen_streak_value,
        frozen_streak_modifier,
        notes,
        initiated_by
    ) SELECT
        p_player_id,
        'removed',
        shield_tokens_available,
        shield_tokens_available,
        v_frozen_streak,
        v_frozen_modifier,
        p_reason,
        COALESCE(p_admin_id, 'system')
    FROM players WHERE id = p_player_id;

    RETURN QUERY SELECT true, 'Shield protection removed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_shield_protection IS 'Removes active shield protection from a player, called when streak naturally reached or broken';

-- =====================================================
-- 8. Function: return_shield_token
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
-- 9. Function: process_shield_streak_protection
-- =====================================================

CREATE OR REPLACE FUNCTION process_shield_streak_protection(p_game_id UUID)
RETURNS TABLE (
    player_id UUID,
    action_taken TEXT,
    details TEXT
) AS $$
DECLARE
    v_player RECORD;
    v_frozen_streak INTEGER;
    v_current_streak INTEGER;
BEGIN
    -- Process all players with active shields
    FOR v_player IN
        SELECT
            p.id,
            p.friendly_name,
            p.shield_active,
            p.frozen_streak_value,
            p.current_streak,
            stu.game_id as shield_game_id
        FROM players p
        LEFT JOIN shield_token_usage stu ON p.id = stu.player_id AND stu.is_active = true
        WHERE p.shield_active = true
    LOOP
        v_frozen_streak := v_player.frozen_streak_value;
        v_current_streak := v_player.current_streak;

        -- Check if player has reached their frozen streak naturally
        IF v_current_streak >= v_frozen_streak THEN
            -- Remove shield protection - they've earned their streak back
            PERFORM remove_shield_protection(
                v_player.id,
                format('Natural streak of %s reached frozen level of %s', v_current_streak, v_frozen_streak)
            );

            RETURN QUERY SELECT
                v_player.id,
                'shield_removed'::TEXT,
                format('Reached natural streak of %s (frozen was %s)', v_current_streak, v_frozen_streak)::TEXT;
        ELSE
            -- Shield remains active, maintain frozen streak
            RETURN QUERY SELECT
                v_player.id,
                'shield_maintained'::TEXT,
                format('Frozen streak %s maintained (current natural: %s)', v_frozen_streak, v_current_streak)::TEXT;
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
            'Missed game without using shield'
        );

        -- Reset streak to 0 (handled by normal streak logic)
        RETURN QUERY SELECT
            v_player.id,
            'shield_broken'::TEXT,
            'Missed game without shield protection - streak reset'::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_shield_streak_protection IS 'Processes shield protection after game selection, maintains or removes shields as appropriate';

-- =====================================================
-- 10. Trigger: Automatic shield token issuance
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_issue_shield_tokens()
RETURNS TRIGGER AS $$
DECLARE
    v_player RECORD;
    v_games_milestone INTEGER;
BEGIN
    -- Only process when game is marked as completed
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        -- Find all selected players and check for milestone
        FOR v_player IN
            SELECT
                gr.player_id,
                p.shield_tokens_available,
                p.games_played_since_shield_launch + 1 as new_games_count
            FROM game_registrations gr
            JOIN players p ON gr.player_id = p.id
            WHERE gr.game_id = NEW.id
            AND gr.status = 'selected'
        LOOP
            -- Calculate milestone (every 10 games)
            v_games_milestone := v_player.new_games_count / 10;

            -- Increment games played counter
            UPDATE players
            SET games_played_since_shield_launch = games_played_since_shield_launch + 1
            WHERE id = v_player.player_id;

            -- If reached milestone and not at max tokens, issue a token
            IF v_player.new_games_count % 10 = 0 AND v_player.shield_tokens_available < 4 THEN
                PERFORM issue_shield_token(
                    v_player.player_id,
                    format('Earned through %s games played', v_player.new_games_count)
                );
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_issue_shield_tokens_on_completion
AFTER UPDATE OF completed ON games
FOR EACH ROW
EXECUTE FUNCTION trigger_issue_shield_tokens();

COMMENT ON FUNCTION trigger_issue_shield_tokens IS 'Automatically issues shield tokens when players reach 10-game milestones';

-- =====================================================
-- 11. Trigger: Return shield tokens on game deletion
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_return_shields_on_game_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Return shield tokens for any players who used shields for this game
    PERFORM return_shield_token(
        stu.player_id,
        OLD.id,
        'Game deleted by admin'
    )
    FROM shield_token_usage stu
    WHERE stu.game_id = OLD.id AND stu.is_active = true;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_return_shields_on_game_delete
BEFORE DELETE ON games
FOR EACH ROW
EXECUTE FUNCTION trigger_return_shields_on_game_delete();

COMMENT ON FUNCTION trigger_return_shields_on_game_delete IS 'Returns shield tokens when games are deleted';

-- =====================================================
-- 12. RLS Policies
-- =====================================================

-- Allow players to view their own shield data
ALTER TABLE shield_token_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own shield history"
ON shield_token_history FOR SELECT
USING (
    player_id IN (
        SELECT id FROM players WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all shield history"
ON shield_token_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM players p
        JOIN admin_roles ar ON p.user_id = ar.user_id
        WHERE p.user_id = auth.uid()
    )
);

-- Shield token usage policies
ALTER TABLE shield_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own shield usage"
ON shield_token_usage FOR SELECT
USING (
    player_id IN (
        SELECT id FROM players WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all shield usage"
ON shield_token_usage FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM players p
        JOIN admin_roles ar ON p.user_id = ar.user_id
        WHERE p.user_id = auth.uid()
    )
);

-- =====================================================
-- 13. Create materialized view for easy querying
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS player_shield_status AS
SELECT
    p.id as player_id,
    p.friendly_name,
    p.shield_tokens_available,
    p.games_played_since_shield_launch,
    p.shield_active,
    p.frozen_streak_value,
    p.frozen_streak_modifier,
    p.current_streak,
    -- Progress to next token
    (p.games_played_since_shield_launch % 10) as games_toward_next_token,
    (10 - (p.games_played_since_shield_launch % 10)) as games_until_next_token,
    -- Active shield usage
    (
        SELECT array_agg(
            json_build_object(
                'game_id', stu.game_id,
                'used_at', stu.used_at,
                'frozen_streak', stu.frozen_streak_value
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

COMMENT ON MATERIALIZED VIEW player_shield_status IS 'Aggregated view of player shield token status for efficient querying';

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_player_shield_status()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY player_shield_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to refresh view when relevant data changes
CREATE OR REPLACE FUNCTION trigger_refresh_shield_status()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_player_shield_status();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only refresh on significant changes (not every update)
CREATE TRIGGER trigger_refresh_shield_status_on_token_change
AFTER INSERT OR UPDATE OF shield_tokens_available, shield_active ON players
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_shield_status();

-- =====================================================
-- Migration Complete
-- =====================================================
