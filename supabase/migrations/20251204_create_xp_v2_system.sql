-- XP System v2: Diminishing streak returns + Linear base XP decay
-- This runs alongside the existing XP system for comparison purposes

-- ============================================
-- 1. Create player_xp_v2 table
-- ============================================
CREATE TABLE IF NOT EXISTS player_xp_v2 (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    rarity TEXT,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE player_xp_v2 IS 'XP System v2 - Experimental system with diminishing streak returns and linear base XP decay. Runs alongside current system for comparison.';

-- ============================================
-- 2. Create calculate_player_xp_v2 function
-- ============================================
CREATE OR REPLACE FUNCTION calculate_player_xp_v2(p_player_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_base_xp DECIMAL;
    v_streak_modifier DECIMAL;
    v_reserve_modifier DECIMAL;
    v_registration_modifier DECIMAL;
    v_unpaid_games_modifier DECIMAL;
    v_total_modifier DECIMAL;
    v_reserve_xp DECIMAL;
    v_final_xp INTEGER;
    v_latest_game_number INTEGER;
    v_current_streak INTEGER;
BEGIN
    -- Get the latest game number from ALL games
    SELECT MAX(sequence_number) INTO v_latest_game_number FROM games WHERE completed = true;

    -- ============================================
    -- V2 CHANGE #1: Linear Base XP Decay
    -- Formula: GREATEST(1, 20 - (games_ago * 0.5))
    -- 0 games ago = 20 XP
    -- 38 games ago = 1 XP
    -- 39+ games ago = 1 XP (floor)
    -- ============================================
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
            -- V2: Linear decay with floor at 1 XP
            GREATEST(1.0, 20.0 - (games_ago * 0.5)) as weight
        FROM player_games
    )
    SELECT COALESCE(SUM(weight), 0)
    INTO v_base_xp
    FROM game_weights;

    -- Calculate reserve XP (5 XP per reserve game, same as v1 but no 40-game cutoff since linear decay handles it)
    WITH reserve_games AS (
        SELECT
            g.sequence_number,
            (v_latest_game_number - g.sequence_number) as games_ago
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        WHERE gr.player_id = p_player_id
        AND gr.status = 'reserve'
        AND g.completed = true
        AND (gr.late_reserve = false OR gr.late_reserve IS NULL)
    )
    SELECT COALESCE(COUNT(*) * 5, 0)
    INTO v_reserve_xp
    FROM reserve_games
    WHERE games_ago < 40;  -- Keep 40 game limit for reserve XP

    -- Add reserve XP to base XP before multipliers
    v_base_xp := v_base_xp + v_reserve_xp;

    -- Get current streak for calculations
    SELECT COALESCE(current_streak, 0)
    INTO v_current_streak
    FROM players
    WHERE id = p_player_id;

    -- ============================================
    -- V2 CHANGE #2: Diminishing Streak Returns
    -- 1 game: +10% (total: 10%)
    -- 2 games: +9% (total: 19%)
    -- 3 games: +8% (total: 27%)
    -- ...
    -- 10 games: +1% (total: 55%)
    -- 11+ games: +1% each (total: 55% + (streak-10)%)
    -- ============================================
    SELECT
        CASE
            WHEN v_current_streak <= 0 THEN 0
            WHEN v_current_streak <= 10 THEN
                -- Sum of (11-i) for i from 1 to streak
                -- Formula: streak * 11 - (streak * (streak + 1)) / 2
                (v_current_streak * 11.0 - (v_current_streak * (v_current_streak + 1)) / 2.0) / 100.0
            ELSE
                -- 55% + 1% for each game beyond 10
                (55.0 + (v_current_streak - 10)) / 100.0
        END
    INTO v_streak_modifier;

    -- Bench warmer modifier: +5% per consecutive reserve (UNCHANGED - stays linear)
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
            ) THEN COALESCE(
                (SELECT bench_warmer_streak * 0.05 FROM players WHERE id = p_player_id),
                0.05
            )
            ELSE 0
        END
    INTO v_reserve_modifier;

    -- Registration streak modifier: +2.5% per streak if bonus applies (UNCHANGED - stays linear)
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

    -- Unpaid games modifier: -50% per unpaid game (UNCHANGED)
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

    -- Calculate total modifier by combining all modifiers
    v_total_modifier := 1 + v_streak_modifier + v_reserve_modifier + v_registration_modifier + v_unpaid_games_modifier;

    -- Calculate final XP and ensure it's never negative
    v_final_xp := GREATEST(0, ROUND(v_base_xp * v_total_modifier));

    RETURN v_final_xp;
END;
$function$;

COMMENT ON FUNCTION calculate_player_xp_v2 IS 'XP v2 calculation with diminishing streak returns (10%,9%,8%...1%) and linear base XP decay (20 -> 1 over 38 games)';

-- ============================================
-- 3. Create recalculate_all_player_xp_v2 function
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_all_player_xp_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    player_record RECORD;
    v_new_xp INTEGER;
    v_rank INTEGER := 0;
    v_prev_xp INTEGER := NULL;
BEGIN
    -- Calculate XP for all players
    FOR player_record IN
        SELECT id FROM players
    LOOP
        v_new_xp := calculate_player_xp_v2(player_record.id);

        INSERT INTO player_xp_v2 (player_id, xp, last_calculated)
        VALUES (player_record.id, v_new_xp, NOW())
        ON CONFLICT (player_id)
        DO UPDATE SET
            xp = v_new_xp,
            last_calculated = NOW();
    END LOOP;

    -- Update ranks (handling ties - same XP = same rank)
    v_rank := 0;
    v_prev_xp := NULL;

    FOR player_record IN
        SELECT player_id, xp
        FROM player_xp_v2
        ORDER BY xp DESC
    LOOP
        IF v_prev_xp IS NULL OR player_record.xp != v_prev_xp THEN
            v_rank := v_rank + 1;
        END IF;

        UPDATE player_xp_v2
        SET rank = v_rank
        WHERE player_id = player_record.player_id;

        v_prev_xp := player_record.xp;
    END LOOP;

    -- Update rarity tiers based on percentile
    UPDATE player_xp_v2 pxv
    SET rarity = CASE
        WHEN pxv.xp = 0 THEN 'Retired'
        WHEN pxv.rank <= CEIL((SELECT COUNT(*) FROM player_xp_v2 WHERE xp > 0) * 0.02) THEN 'Legendary'
        WHEN pxv.rank <= CEIL((SELECT COUNT(*) FROM player_xp_v2 WHERE xp > 0) * 0.07) THEN 'World Class'
        WHEN pxv.rank <= CEIL((SELECT COUNT(*) FROM player_xp_v2 WHERE xp > 0) * 0.20) THEN 'Professional'
        WHEN pxv.rank <= CEIL((SELECT COUNT(*) FROM player_xp_v2 WHERE xp > 0) * 0.40) THEN 'Semi Pro'
        ELSE 'Amateur'
    END;
END;
$function$;

COMMENT ON FUNCTION recalculate_all_player_xp_v2 IS 'Batch recalculate all player XP using v2 formula and update ranks/rarity';

-- ============================================
-- 4. Create trigger function for auto-calculation
-- ============================================
CREATE OR REPLACE FUNCTION trigger_recalculate_xp_v2_on_game_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Only run when a game is marked as completed
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        PERFORM recalculate_all_player_xp_v2();
    END IF;

    RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_xp_v2_on_game_complete ON games;
CREATE TRIGGER trigger_xp_v2_on_game_complete
    AFTER UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_xp_v2_on_game_complete();

COMMENT ON TRIGGER trigger_xp_v2_on_game_complete ON games IS 'Auto-recalculate XP v2 when games are completed';

-- ============================================
-- 5. Create player_xp_comparison view
-- ============================================
CREATE OR REPLACE VIEW player_xp_comparison AS
SELECT
    p.id as player_id,
    p.friendly_name,
    p.current_streak,
    px.xp as current_xp,
    px.rank as current_rank,
    px.rarity as current_rarity,
    pxv.xp as v2_xp,
    pxv.rank as v2_rank,
    pxv.rarity as v2_rarity,
    px.xp - COALESCE(pxv.xp, 0) as xp_difference,
    COALESCE(px.rank, 0) - COALESCE(pxv.rank, 0) as rank_difference,
    CASE
        WHEN p.current_streak <= 0 THEN 0
        ELSE p.current_streak * 10
    END as current_streak_bonus_pct,
    CASE
        WHEN p.current_streak <= 0 THEN 0
        WHEN p.current_streak <= 10 THEN
            (p.current_streak * 11 - (p.current_streak * (p.current_streak + 1)) / 2)
        ELSE
            55 + (p.current_streak - 10)
    END as v2_streak_bonus_pct
FROM players p
LEFT JOIN player_xp px ON px.player_id = p.id
LEFT JOIN player_xp_v2 pxv ON pxv.player_id = p.id
WHERE px.xp > 0 OR pxv.xp > 0
ORDER BY px.xp DESC NULLS LAST;

COMMENT ON VIEW player_xp_comparison IS 'Comparison view showing current XP vs v2 XP side by side';

-- ============================================
-- 6. RLS Policies
-- ============================================
ALTER TABLE player_xp_v2 ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all v2 XP data
CREATE POLICY "Admins can read all player_xp_v2"
ON player_xp_v2
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_roles ar
        WHERE ar.player_id = (
            SELECT id FROM players WHERE user_id = auth.uid()
        )
    )
);

-- Allow service role full access
CREATE POLICY "Service role has full access to player_xp_v2"
ON player_xp_v2
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 7. Initial population of v2 data
-- ============================================
SELECT recalculate_all_player_xp_v2();
