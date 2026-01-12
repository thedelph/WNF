-- =====================================================
-- Injury Token System Migration
-- =====================================================
-- Implements the Injury Token (🩹) system for streak protection
-- when players are injured during WNF games.
--
-- Key difference from Shield Token:
-- - Shield: Gradual decay (starts at protected, decreases each game)
-- - Injury: Return at half (fixed 50% reduction, then build up)
--
-- Activation: Player or admin activates within soft 48h window
-- Return: Auto-processed when player registers for a game
-- Concurrent: Injury token inherits effective streak from active shield

-- =====================================================
-- 1. Add columns to players table
-- =====================================================

ALTER TABLE players
ADD COLUMN IF NOT EXISTS injury_token_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS injury_original_streak INTEGER,
ADD COLUMN IF NOT EXISTS injury_return_streak INTEGER,
ADD COLUMN IF NOT EXISTS injury_activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS injury_game_id UUID REFERENCES games(id) ON DELETE SET NULL;

COMMENT ON COLUMN players.injury_token_active IS 'Whether player currently has an active injury token protecting their streak';
COMMENT ON COLUMN players.injury_original_streak IS 'The original streak value when injury token was activated';
COMMENT ON COLUMN players.injury_return_streak IS 'The streak value player will return with (half of original, rounded up)';
COMMENT ON COLUMN players.injury_activated_at IS 'When the injury token was activated';
COMMENT ON COLUMN players.injury_game_id IS 'The game where the injury occurred';

-- =====================================================
-- 2. Create injury_token_usage table
-- =====================================================

CREATE TABLE IF NOT EXISTS injury_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    injury_game_id UUID NOT NULL REFERENCES games(id) ON DELETE SET NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    original_streak INTEGER NOT NULL,
    return_streak INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'returned', 'denied', 'expired')),
    returned_at TIMESTAMP WITH TIME ZONE,
    return_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    denied_by UUID REFERENCES auth.users(id),
    denied_at TIMESTAMP WITH TIME ZONE,
    denied_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(player_id, injury_game_id)
);

CREATE INDEX idx_injury_token_usage_player ON injury_token_usage(player_id);
CREATE INDEX idx_injury_token_usage_injury_game ON injury_token_usage(injury_game_id);
CREATE INDEX idx_injury_token_usage_status ON injury_token_usage(status) WHERE status = 'active';

COMMENT ON TABLE injury_token_usage IS 'Tracks injury token usage per game, links injuries to specific games';

-- =====================================================
-- 3. Create injury_token_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS injury_token_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('activated', 'returned', 'denied', 'admin_activated', 'expired')),
    injury_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    return_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    original_streak INTEGER,
    return_streak INTEGER,
    notes TEXT,
    initiated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_injury_token_history_player ON injury_token_history(player_id);
CREATE INDEX idx_injury_token_history_created_at ON injury_token_history(created_at DESC);

COMMENT ON TABLE injury_token_history IS 'Audit log of all injury token operations for transparency and debugging';

-- =====================================================
-- 4. Function: check_injury_token_eligibility
-- =====================================================

CREATE OR REPLACE FUNCTION check_injury_token_eligibility(p_player_id UUID, p_game_id UUID)
RETURNS TABLE (
    eligible BOOLEAN,
    reason TEXT,
    current_streak INTEGER,
    effective_streak INTEGER,
    return_streak INTEGER,
    has_active_shield BOOLEAN
) AS $$
DECLARE
    v_player_was_selected BOOLEAN;
    v_game_completed BOOLEAN;
    v_game_date TIMESTAMP WITH TIME ZONE;
    v_already_claimed BOOLEAN;
    v_has_active_injury BOOLEAN;
    v_current_streak INTEGER;
    v_shield_active BOOLEAN;
    v_protected_streak_value INTEGER;
    v_effective_streak INTEGER;
    v_return_streak INTEGER;
BEGIN
    -- Check if player was selected for this game
    SELECT EXISTS(
        SELECT 1 FROM game_registrations gr
        WHERE gr.player_id = p_player_id
        AND gr.game_id = p_game_id
        AND gr.status = 'selected'
    ) INTO v_player_was_selected;

    IF NOT v_player_was_selected THEN
        RETURN QUERY SELECT false, 'Player was not selected for this game'::TEXT, 0, 0, 0, false;
        RETURN;
    END IF;

    -- Check if game is completed
    SELECT completed, date INTO v_game_completed, v_game_date
    FROM games WHERE id = p_game_id;

    IF NOT v_game_completed THEN
        RETURN QUERY SELECT false, 'Game is not yet completed'::TEXT, 0, 0, 0, false;
        RETURN;
    END IF;

    -- Check if already claimed for this game
    SELECT EXISTS(
        SELECT 1 FROM injury_token_usage
        WHERE player_id = p_player_id AND injury_game_id = p_game_id
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        RETURN QUERY SELECT false, 'Injury token already claimed for this game'::TEXT, 0, 0, 0, false;
        RETURN;
    END IF;

    -- Check if player already has an active injury token
    SELECT injury_token_active INTO v_has_active_injury
    FROM players WHERE id = p_player_id;

    IF v_has_active_injury THEN
        RETURN QUERY SELECT false, 'Player already has an active injury token'::TEXT, 0, 0, 0, false;
        RETURN;
    END IF;

    -- Get player's current streak and shield status
    SELECT
        COALESCE(current_streak, 0),
        shield_active,
        protected_streak_value
    INTO v_current_streak, v_shield_active, v_protected_streak_value
    FROM players WHERE id = p_player_id;

    -- Calculate effective streak (considering active shield)
    IF v_shield_active AND v_protected_streak_value IS NOT NULL THEN
        -- Use effective streak from shield's gradual decay
        v_effective_streak := GREATEST(
            v_current_streak,
            v_protected_streak_value - v_current_streak
        );
    ELSE
        v_effective_streak := v_current_streak;
    END IF;

    -- Calculate return streak (half, rounded up)
    v_return_streak := CEIL(v_effective_streak::NUMERIC / 2);

    RETURN QUERY SELECT
        true,
        'Eligible for injury token'::TEXT,
        v_current_streak,
        v_effective_streak,
        v_return_streak,
        v_shield_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_injury_token_eligibility IS 'Checks if a player can claim an injury token for a specific game, calculates return streak';

-- =====================================================
-- 5. Function: activate_injury_token
-- =====================================================

CREATE OR REPLACE FUNCTION activate_injury_token(
    p_player_id UUID,
    p_injury_game_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    original_streak INTEGER,
    return_streak INTEGER
) AS $$
DECLARE
    v_eligible BOOLEAN;
    v_reason TEXT;
    v_current_streak INTEGER;
    v_effective_streak INTEGER;
    v_return_streak INTEGER;
    v_has_active_shield BOOLEAN;
BEGIN
    -- Check eligibility
    SELECT e.eligible, e.reason, e.current_streak, e.effective_streak, e.return_streak, e.has_active_shield
    INTO v_eligible, v_reason, v_current_streak, v_effective_streak, v_return_streak, v_has_active_shield
    FROM check_injury_token_eligibility(p_player_id, p_injury_game_id) e;

    IF NOT v_eligible THEN
        RETURN QUERY SELECT false, v_reason, 0, 0;
        RETURN;
    END IF;

    -- If shield is active, clear it (injury token supersedes)
    IF v_has_active_shield THEN
        UPDATE players
        SET
            shield_active = false,
            protected_streak_value = NULL,
            protected_streak_base = NULL
        WHERE id = p_player_id;

        -- Mark shield usages as inactive
        UPDATE shield_token_usage
        SET
            is_active = false,
            removed_at = CURRENT_TIMESTAMP,
            removal_reason = 'Superseded by injury token'
        WHERE player_id = p_player_id AND is_active = true;

        -- Log shield removal
        INSERT INTO shield_token_history (
            player_id,
            action_type,
            tokens_before,
            tokens_after,
            notes,
            initiated_by
        ) SELECT
            p_player_id,
            'removed',
            shield_tokens_available,
            shield_tokens_available,
            'Shield superseded by injury token activation',
            'system'
        FROM players WHERE id = p_player_id;
    END IF;

    -- Update player's injury token status
    UPDATE players
    SET
        injury_token_active = true,
        injury_original_streak = v_effective_streak,
        injury_return_streak = v_return_streak,
        injury_activated_at = CURRENT_TIMESTAMP,
        injury_game_id = p_injury_game_id
    WHERE id = p_player_id;

    -- Create injury token usage record
    INSERT INTO injury_token_usage (
        player_id,
        injury_game_id,
        original_streak,
        return_streak,
        notes,
        status
    ) VALUES (
        p_player_id,
        p_injury_game_id,
        v_effective_streak,
        v_return_streak,
        p_notes,
        'active'
    );

    -- Log in history
    INSERT INTO injury_token_history (
        player_id,
        action_type,
        injury_game_id,
        original_streak,
        return_streak,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'activated',
        p_injury_game_id,
        v_effective_streak,
        v_return_streak,
        CASE
            WHEN v_has_active_shield THEN
                format('Activated (inherited effective streak %s from shield). %s', v_effective_streak, COALESCE(p_notes, ''))
            ELSE
                COALESCE(p_notes, 'Injury token activated')
        END,
        'player'
    );

    RETURN QUERY SELECT true, 'Injury token activated successfully'::TEXT, v_effective_streak, v_return_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_injury_token IS 'Activates an injury token for a player. If shield is active, inherits effective streak and clears shield.';

-- =====================================================
-- 6. Function: admin_activate_injury_token
-- =====================================================

CREATE OR REPLACE FUNCTION admin_activate_injury_token(
    p_player_id UUID,
    p_injury_game_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_admin_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    original_streak INTEGER,
    return_streak INTEGER
) AS $$
DECLARE
    v_player_was_selected BOOLEAN;
    v_game_completed BOOLEAN;
    v_already_claimed BOOLEAN;
    v_has_active_injury BOOLEAN;
    v_current_streak INTEGER;
    v_shield_active BOOLEAN;
    v_protected_streak_value INTEGER;
    v_effective_streak INTEGER;
    v_return_streak INTEGER;
BEGIN
    -- Check if player was selected for this game (admin can bypass time window)
    SELECT EXISTS(
        SELECT 1 FROM game_registrations gr
        WHERE gr.player_id = p_player_id
        AND gr.game_id = p_injury_game_id
        AND gr.status = 'selected'
    ) INTO v_player_was_selected;

    IF NOT v_player_was_selected THEN
        RETURN QUERY SELECT false, 'Player was not selected for this game'::TEXT, 0, 0;
        RETURN;
    END IF;

    -- Check if game is completed
    SELECT completed INTO v_game_completed
    FROM games WHERE id = p_injury_game_id;

    IF NOT v_game_completed THEN
        RETURN QUERY SELECT false, 'Game is not yet completed'::TEXT, 0, 0;
        RETURN;
    END IF;

    -- Check if already claimed
    SELECT EXISTS(
        SELECT 1 FROM injury_token_usage
        WHERE player_id = p_player_id AND injury_game_id = p_injury_game_id
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        RETURN QUERY SELECT false, 'Injury token already claimed for this game'::TEXT, 0, 0;
        RETURN;
    END IF;

    -- Check if player already has an active injury token
    SELECT injury_token_active INTO v_has_active_injury
    FROM players WHERE id = p_player_id;

    IF v_has_active_injury THEN
        RETURN QUERY SELECT false, 'Player already has an active injury token'::TEXT, 0, 0;
        RETURN;
    END IF;

    -- Get player's current streak and shield status
    SELECT
        COALESCE(current_streak, 0),
        shield_active,
        protected_streak_value
    INTO v_current_streak, v_shield_active, v_protected_streak_value
    FROM players WHERE id = p_player_id;

    -- Calculate effective streak
    IF v_shield_active AND v_protected_streak_value IS NOT NULL THEN
        v_effective_streak := GREATEST(
            v_current_streak,
            v_protected_streak_value - v_current_streak
        );
    ELSE
        v_effective_streak := v_current_streak;
    END IF;

    v_return_streak := CEIL(v_effective_streak::NUMERIC / 2);

    -- Clear shield if active
    IF v_shield_active THEN
        UPDATE players
        SET
            shield_active = false,
            protected_streak_value = NULL,
            protected_streak_base = NULL
        WHERE id = p_player_id;

        UPDATE shield_token_usage
        SET
            is_active = false,
            removed_at = CURRENT_TIMESTAMP,
            removal_reason = 'Superseded by admin-activated injury token'
        WHERE player_id = p_player_id AND is_active = true;

        INSERT INTO shield_token_history (
            player_id,
            action_type,
            tokens_before,
            tokens_after,
            notes,
            initiated_by
        ) SELECT
            p_player_id,
            'removed',
            shield_tokens_available,
            shield_tokens_available,
            'Shield superseded by admin-activated injury token',
            COALESCE(p_admin_id, 'admin')
        FROM players WHERE id = p_player_id;
    END IF;

    -- Update player
    UPDATE players
    SET
        injury_token_active = true,
        injury_original_streak = v_effective_streak,
        injury_return_streak = v_return_streak,
        injury_activated_at = CURRENT_TIMESTAMP,
        injury_game_id = p_injury_game_id
    WHERE id = p_player_id;

    -- Create usage record
    INSERT INTO injury_token_usage (
        player_id,
        injury_game_id,
        original_streak,
        return_streak,
        notes,
        status
    ) VALUES (
        p_player_id,
        p_injury_game_id,
        v_effective_streak,
        v_return_streak,
        p_notes,
        'active'
    );

    -- Log in history
    INSERT INTO injury_token_history (
        player_id,
        action_type,
        injury_game_id,
        original_streak,
        return_streak,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'admin_activated',
        p_injury_game_id,
        v_effective_streak,
        v_return_streak,
        COALESCE(p_notes, 'Admin-activated injury token'),
        COALESCE(p_admin_id, 'admin')
    );

    RETURN QUERY SELECT true, 'Injury token activated by admin'::TEXT, v_effective_streak, v_return_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_activate_injury_token IS 'Admin function to activate injury token, bypasses time window restrictions';

-- =====================================================
-- 7. Function: process_injury_return
-- =====================================================

CREATE OR REPLACE FUNCTION process_injury_return(
    p_player_id UUID,
    p_return_game_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_streak INTEGER
) AS $$
DECLARE
    v_has_active_injury BOOLEAN;
    v_return_streak INTEGER;
    v_original_streak INTEGER;
    v_injury_game_id UUID;
BEGIN
    -- Check if player has active injury token
    SELECT
        injury_token_active,
        injury_return_streak,
        injury_original_streak,
        injury_game_id
    INTO v_has_active_injury, v_return_streak, v_original_streak, v_injury_game_id
    FROM players WHERE id = p_player_id;

    IF NOT v_has_active_injury THEN
        RETURN QUERY SELECT false, 'No active injury token to process'::TEXT, 0;
        RETURN;
    END IF;

    -- Update player's streak to return value and clear injury token
    UPDATE players
    SET
        current_streak = v_return_streak,
        injury_token_active = false,
        injury_original_streak = NULL,
        injury_return_streak = NULL,
        injury_activated_at = NULL,
        injury_game_id = NULL
    WHERE id = p_player_id;

    -- Update usage record
    UPDATE injury_token_usage
    SET
        status = 'returned',
        returned_at = CURRENT_TIMESTAMP,
        return_game_id = p_return_game_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE player_id = p_player_id
    AND injury_game_id = v_injury_game_id
    AND status = 'active';

    -- Log in history
    INSERT INTO injury_token_history (
        player_id,
        action_type,
        injury_game_id,
        return_game_id,
        original_streak,
        return_streak,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'returned',
        v_injury_game_id,
        p_return_game_id,
        v_original_streak,
        v_return_streak,
        format('Player returned from injury reserve. Streak set to %s (was %s)', v_return_streak, v_original_streak),
        'system'
    );

    RETURN QUERY SELECT true, format('Welcome back! Streak set to %s games', v_return_streak)::TEXT, v_return_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_injury_return IS 'Processes player return from injury reserve, sets streak to return value';

-- =====================================================
-- 8. Function: deny_injury_token
-- =====================================================

CREATE OR REPLACE FUNCTION deny_injury_token(
    p_player_id UUID,
    p_injury_game_id UUID,
    p_reason TEXT,
    p_admin_id TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_has_active BOOLEAN;
    v_original_streak INTEGER;
    v_return_streak INTEGER;
BEGIN
    -- Check if there's an active injury token for this game
    SELECT
        injury_token_active,
        injury_original_streak,
        injury_return_streak
    INTO v_has_active, v_original_streak, v_return_streak
    FROM players
    WHERE id = p_player_id AND injury_game_id = p_injury_game_id;

    IF NOT v_has_active THEN
        RETURN QUERY SELECT false, 'No active injury token for this game'::TEXT;
        RETURN;
    END IF;

    -- Clear injury token from player (but don't reset streak - just remove protection)
    UPDATE players
    SET
        injury_token_active = false,
        injury_original_streak = NULL,
        injury_return_streak = NULL,
        injury_activated_at = NULL,
        injury_game_id = NULL
    WHERE id = p_player_id;

    -- Update usage record
    UPDATE injury_token_usage
    SET
        status = 'denied',
        denied_at = CURRENT_TIMESTAMP,
        denied_by = p_admin_id::UUID,
        denied_reason = p_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE player_id = p_player_id
    AND injury_game_id = p_injury_game_id
    AND status = 'active';

    -- Log in history
    INSERT INTO injury_token_history (
        player_id,
        action_type,
        injury_game_id,
        original_streak,
        return_streak,
        notes,
        initiated_by
    ) VALUES (
        p_player_id,
        'denied',
        p_injury_game_id,
        v_original_streak,
        v_return_streak,
        format('Denied by admin: %s', p_reason),
        p_admin_id
    );

    RETURN QUERY SELECT true, 'Injury token denied'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deny_injury_token IS 'Admin function to deny an injury token claim';

-- =====================================================
-- 9. Function: get_injury_token_status
-- =====================================================

CREATE OR REPLACE FUNCTION get_injury_token_status(p_player_id UUID)
RETURNS TABLE (
    is_active BOOLEAN,
    original_streak INTEGER,
    return_streak INTEGER,
    activated_at TIMESTAMP WITH TIME ZONE,
    injury_game_id UUID,
    injury_game_date TIMESTAMP WITH TIME ZONE,
    injury_game_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.injury_token_active,
        p.injury_original_streak,
        p.injury_return_streak,
        p.injury_activated_at,
        p.injury_game_id,
        g.date,
        g.sequence_number
    FROM players p
    LEFT JOIN games g ON p.injury_game_id = g.id
    WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_injury_token_status IS 'Gets current injury token status for a player';

-- =====================================================
-- 10. Function: get_eligible_injury_games
-- =====================================================

CREATE OR REPLACE FUNCTION get_eligible_injury_games(p_player_id UUID)
RETURNS TABLE (
    game_id UUID,
    game_date TIMESTAMP WITH TIME ZONE,
    sequence_number INTEGER,
    eligible BOOLEAN,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.id,
        g.date,
        g.sequence_number,
        NOT EXISTS(
            SELECT 1 FROM injury_token_usage itu
            WHERE itu.player_id = p_player_id AND itu.injury_game_id = g.id
        ),
        CASE
            WHEN EXISTS(
                SELECT 1 FROM injury_token_usage itu
                WHERE itu.player_id = p_player_id AND itu.injury_game_id = g.id
            ) THEN 'Already claimed'
            ELSE 'Eligible'
        END::TEXT
    FROM games g
    JOIN game_registrations gr ON gr.game_id = g.id
    WHERE gr.player_id = p_player_id
    AND gr.status = 'selected'
    AND g.completed = true
    ORDER BY g.date DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_eligible_injury_games IS 'Gets recent games where player was selected (for admin UI)';

-- =====================================================
-- 11. Function: get_injury_token_stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_injury_token_stats()
RETURNS TABLE (
    active_count BIGINT,
    this_month_count BIGINT,
    total_returned BIGINT,
    total_denied BIGINT,
    avg_recovery_days NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM injury_token_usage WHERE status = 'active'),
        (SELECT COUNT(*) FROM injury_token_usage
         WHERE activated_at >= date_trunc('month', CURRENT_TIMESTAMP)),
        (SELECT COUNT(*) FROM injury_token_usage WHERE status = 'returned'),
        (SELECT COUNT(*) FROM injury_token_usage WHERE status = 'denied'),
        (SELECT COALESCE(AVG(EXTRACT(DAY FROM (returned_at - activated_at))), 0)
         FROM injury_token_usage WHERE status = 'returned');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_injury_token_stats IS 'Gets aggregate statistics for injury token management page';

-- =====================================================
-- 12. RLS Policies
-- =====================================================

ALTER TABLE injury_token_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own injury history"
ON injury_token_history FOR SELECT
USING (
    player_id IN (
        SELECT id FROM players WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all injury history"
ON injury_token_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM admin_roles
        WHERE admin_roles.player_id IN (
            SELECT players.id FROM players WHERE players.user_id = auth.uid()
        )
    )
);

ALTER TABLE injury_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own injury usage"
ON injury_token_usage FOR SELECT
USING (
    player_id IN (
        SELECT id FROM players WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all injury usage"
ON injury_token_usage FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM admin_roles
        WHERE admin_roles.player_id IN (
            SELECT players.id FROM players WHERE players.user_id = auth.uid()
        )
    )
);

-- =====================================================
-- 13. Create view for injury token status
-- =====================================================

CREATE OR REPLACE VIEW player_injury_status AS
SELECT
    p.id as player_id,
    p.friendly_name,
    p.injury_token_active,
    p.injury_original_streak,
    p.injury_return_streak,
    p.injury_activated_at,
    p.injury_game_id,
    g.date as injury_game_date,
    g.sequence_number as injury_game_number,
    CASE
        WHEN p.injury_token_active THEN
            EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.injury_activated_at))::INTEGER
        ELSE NULL
    END as days_on_reserve,
    (
        SELECT json_agg(
            json_build_object(
                'action', ith.action_type,
                'injury_game_id', ith.injury_game_id,
                'created_at', ith.created_at,
                'notes', ith.notes
            ) ORDER BY ith.created_at DESC
        )
        FROM injury_token_history ith
        WHERE ith.player_id = p.id
        LIMIT 5
    ) as recent_history
FROM players p
LEFT JOIN games g ON p.injury_game_id = g.id;

COMMENT ON VIEW player_injury_status IS 'View of player injury token status with game details';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- 1. Added injury token columns to players table
-- 2. Created injury_token_usage table for tracking
-- 3. Created injury_token_history table for audit trail
-- 4. Created check_injury_token_eligibility function
-- 5. Created activate_injury_token function (player self-serve)
-- 6. Created admin_activate_injury_token function (admin override)
-- 7. Created process_injury_return function (auto-return on registration)
-- 8. Created deny_injury_token function (admin denial)
-- 9. Created helper functions for status and stats
-- 10. Set up RLS policies
-- 11. Created view for easy querying
