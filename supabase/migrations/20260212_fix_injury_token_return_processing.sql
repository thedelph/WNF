-- =====================================================
-- Fix: Injury Token Return Processing
-- =====================================================
-- Bugs fixed:
-- 1. process_injury_return was never called on game completion (only on self-registration)
-- 2. Streak triggers overwrite injury streak (zero awareness of injury tokens)
-- 3. Toast field name mismatch (return_streak vs new_streak) - fixed in frontend
-- 4. XP accidentally semi-correct via wrong code path
--
-- Solution: Add injury_streak_bonus column (follows shield token pattern)
-- Formula: effective_streak = natural_consecutive_games + injury_streak_bonus

-- =====================================================
-- A) Add injury_streak_bonus column
-- =====================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS injury_streak_bonus INTEGER DEFAULT NULL;

COMMENT ON COLUMN players.injury_streak_bonus IS 'Bonus streak value from injury token return. Added to natural consecutive game count. Cleared when streak breaks.';

-- =====================================================
-- B) Fix Joe data (before function changes to avoid trigger re-clobbering)
-- =====================================================

-- Set injury_streak_bonus and clear injury fields
UPDATE players
SET
    injury_token_active = false,
    injury_original_streak = NULL,
    injury_return_streak = NULL,
    injury_activated_at = NULL,
    injury_game_id = NULL,
    injury_streak_bonus = 7,
    current_streak = 8
WHERE friendly_name = 'Joe';

-- Update injury_token_usage to returned
UPDATE injury_token_usage
SET
    status = 'returned',
    returned_at = CURRENT_TIMESTAMP,
    return_game_id = '16763305-1909-4ce6-9c21-0e4f199dcd62',
    updated_at = CURRENT_TIMESTAMP
WHERE player_id = (SELECT id FROM players WHERE friendly_name = 'Joe')
AND injury_game_id = '02dad9d4-1526-4d95-901e-c12568ac0637'
AND status = 'active';

-- Insert injury_token_history entry
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
    (SELECT id FROM players WHERE friendly_name = 'Joe'),
    'returned',
    '02dad9d4-1526-4d95-901e-c12568ac0637',
    '16763305-1909-4ce6-9c21-0e4f199dcd62',
    14,
    7,
    'Player returned from injury reserve via migration fix. Streak set to 8 (7 return bonus + 1 natural game). Bug fix: process_injury_return was never called on game completion.',
    'system'
);

-- =====================================================
-- C) Modify process_injury_return to set injury_streak_bonus instead of current_streak
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

    -- Set injury_streak_bonus instead of directly setting current_streak
    -- The streak triggers will add this bonus to the natural consecutive game count
    UPDATE players
    SET
        injury_streak_bonus = v_return_streak,
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
        format('Player returned from injury reserve. Streak bonus set to %s (original was %s)', v_return_streak, v_original_streak),
        'system'
    );

    RETURN QUERY SELECT true, format('Welcome back! Streak bonus set to %s games', v_return_streak)::TEXT, v_return_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_injury_return IS 'Processes player return from injury reserve. Sets injury_streak_bonus instead of current_streak to survive streak trigger recalculations.';

-- =====================================================
-- D) Modify update_streaks_on_game_change() (STATEMENT trigger)
--    - Add injury_streak_bonus to streak calculation
--    - Skip resetting streak for players with injury_token_active
--    - Clear injury_streak_bonus when streak breaks
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_streaks_on_game_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update attendance streaks
    -- Includes injury_streak_bonus for players returning from injury
    WITH player_streaks AS (
        SELECT
            p.id as player_id,
            COUNT(*) as streak,
            COALESCE(p.injury_streak_bonus, 0) as bonus
        FROM players p
        JOIN game_registrations gr ON gr.player_id = p.id
        JOIN games g ON g.id = gr.game_id
        WHERE gr.status = 'selected'
        AND g.completed = true
        AND NOT EXISTS (
            SELECT 1
            FROM games g2
            LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p.id
            WHERE g2.sequence_number > g.sequence_number
            AND g2.completed = true
            AND (gr2.id IS NULL OR gr2.status != 'selected')
        )
        GROUP BY p.id, p.injury_streak_bonus
    )
    UPDATE players p
    SET current_streak = COALESCE(ps.streak, 0) + ps.bonus
    FROM player_streaks ps
    WHERE p.id = ps.player_id;

    -- Reset streaks to 0 for players who previously had streaks but no longer qualify
    -- Skip players with active injury tokens (their streak is protected)
    -- Also clear injury_streak_bonus when streak breaks (missed a game)
    UPDATE players p
    SET
        current_streak = 0,
        injury_streak_bonus = CASE
            WHEN injury_streak_bonus IS NOT NULL THEN NULL
            ELSE injury_streak_bonus
        END
    WHERE p.current_streak > 0
    AND p.injury_token_active IS NOT TRUE
    AND p.id NOT IN (
        SELECT player_id FROM (
            SELECT
                p2.id as player_id
            FROM players p2
            JOIN game_registrations gr ON gr.player_id = p2.id
            JOIN games g ON g.id = gr.game_id
            WHERE gr.status = 'selected'
            AND g.completed = true
            AND NOT EXISTS (
                SELECT 1
                FROM games g2
                LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p2.id
                WHERE g2.sequence_number > g.sequence_number
                AND g2.completed = true
                AND (gr2.id IS NULL OR gr2.status != 'selected')
            )
        ) active_streak_players
    );

    -- Update bench warmer streaks (unchanged)
    WITH bench_streaks AS (
        SELECT
            p.id as player_id,
            COUNT(*) as streak
        FROM players p
        JOIN game_registrations gr ON gr.player_id = p.id
        JOIN games g ON g.id = gr.game_id
        WHERE gr.status = 'reserve'
        AND g.completed = true
        AND NOT EXISTS (
            SELECT 1
            FROM games g2
            LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p.id
            WHERE g2.sequence_number > g.sequence_number
            AND g2.completed = true
            AND (gr2.id IS NULL OR gr2.status != 'reserve')
        )
        GROUP BY p.id
    )
    UPDATE players p
    SET bench_warmer_streak = COALESCE(bs.streak, 0)
    FROM bench_streaks bs
    WHERE p.id = bs.player_id;

    -- Reset bench warmer streaks to 0 (unchanged)
    UPDATE players p
    SET bench_warmer_streak = 0
    WHERE p.bench_warmer_streak > 0
    AND p.id NOT IN (
        SELECT player_id FROM (
            SELECT
                p2.id as player_id
            FROM players p2
            JOIN game_registrations gr ON gr.player_id = p2.id
            JOIN games g ON g.id = gr.game_id
            WHERE gr.status = 'reserve'
            AND g.completed = true
            AND NOT EXISTS (
                SELECT 1
                FROM games g2
                LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p2.id
                WHERE g2.sequence_number > g.sequence_number
                AND g2.completed = true
                AND (gr2.id IS NULL OR gr2.status != 'reserve')
            )
        ) active_bench_streak_players
    );

    RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.update_streaks_on_game_change() IS
'Updated 2026-02-12: Now includes injury_streak_bonus in streak calculation. Clears bonus when streak breaks. Skips streak reset for players with active injury tokens.';

-- =====================================================
-- E) Modify update_player_streaks() (ROW trigger function)
--    - Add injury_streak_bonus when setting current_streak
--    - Clear injury_streak_bonus when streak resets to 0
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_player_streaks()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- For game_registrations changes
    IF TG_TABLE_NAME = 'game_registrations' THEN
        IF EXISTS (
            SELECT 1
            FROM games g
            WHERE g.id = NEW.game_id
            AND ((g.completed = true AND g.needs_completion = false) OR g.is_historical = true)
        ) THEN
            UPDATE players
            SET
                current_streak = calculate_player_streak(NEW.player_id) + COALESCE(injury_streak_bonus, 0),
                bench_warmer_streak = calculate_bench_warmer_streak(NEW.player_id),
                -- Clear injury_streak_bonus if natural streak is 0 (streak broken)
                injury_streak_bonus = CASE
                    WHEN calculate_player_streak(NEW.player_id) = 0 THEN NULL
                    ELSE injury_streak_bonus
                END
            WHERE id = NEW.player_id;
        END IF;

    -- For games changes
    ELSIF TG_TABLE_NAME = 'games' THEN
        IF (TG_OP = 'UPDATE' AND
            (
                (NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL))
                OR (NEW.is_historical = true AND (OLD.is_historical = false OR OLD.is_historical IS NULL))
            )
        ) OR TG_OP = 'DELETE' THEN
            -- Update streaks for all players in this game
            UPDATE players p
            SET
                current_streak = calculate_player_streak(p.id) + COALESCE(p.injury_streak_bonus, 0),
                bench_warmer_streak = calculate_bench_warmer_streak(p.id),
                -- Clear injury_streak_bonus if natural streak is 0 (streak broken)
                injury_streak_bonus = CASE
                    WHEN calculate_player_streak(p.id) = 0 THEN NULL
                    ELSE p.injury_streak_bonus
                END
            FROM game_registrations gr
            WHERE gr.game_id = COALESCE(NEW.id, OLD.id)
            AND gr.player_id = p.id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

COMMENT ON FUNCTION public.update_player_streaks() IS
'Updated 2026-02-12: Now includes injury_streak_bonus in streak calculation. Clears bonus when natural streak resets to 0.';

-- =====================================================
-- F) Add auto-return trigger on game completion
--    Fires BEFORE streak triggers (a_ prefix for alphabetical ordering)
-- =====================================================

CREATE OR REPLACE FUNCTION process_injury_returns_on_game_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_injured_player RECORD;
BEGIN
    -- Only fire when game is being marked as completed
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Find all players with active injury tokens who are selected in this game
        FOR v_injured_player IN
            SELECT gr.player_id
            FROM game_registrations gr
            JOIN players p ON p.id = gr.player_id
            WHERE gr.game_id = NEW.id
            AND gr.status = 'selected'
            AND p.injury_token_active = true
        LOOP
            -- Process injury return for each player
            PERFORM process_injury_return(v_injured_player.player_id, NEW.id);
        END LOOP;
    END IF;

    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION process_injury_returns_on_game_complete() IS
'Auto-processes injury token returns when a game is completed. Fires before streak triggers so injury_streak_bonus is set before streak recalculation.';

-- Create trigger with a_ prefix to fire before streak triggers alphabetically
CREATE TRIGGER a_process_injury_returns_on_game_complete
    AFTER UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION process_injury_returns_on_game_complete();

-- =====================================================
-- G) Recalculate XP
-- =====================================================

SELECT recalculate_all_player_xp_v2();
