-- Migration: Add Rivalry and Trio Awards to Hall of Fame
-- Description:
--   1. Rename 'dream_team' to 'dynamic_duo' (clearer naming)
--   2. Add partner2_id column for trio awards
--   3. Add FIERCEST_RIVALRY award calculation
--   4. Add DREAM_TEAM_TRIO award calculation
--   5. Update get_awards_by_year to return partner2_name

-- ============================================================================
-- Step 1: Rename existing dream_team awards to dynamic_duo
-- ============================================================================
UPDATE player_awards
SET award_category = 'dynamic_duo'
WHERE award_category = 'dream_team';

-- ============================================================================
-- Step 2: Add partner2_id column for trio awards
-- ============================================================================
ALTER TABLE player_awards
ADD COLUMN IF NOT EXISTS partner2_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- Create index for partner2_id lookups
CREATE INDEX IF NOT EXISTS idx_player_awards_partner2_id ON player_awards(partner2_id);

-- ============================================================================
-- Step 3: Update calculate_awards function
-- Adds FIERCEST_RIVALRY and DREAM_TEAM_TRIO sections
-- Renames dream_team to dynamic_duo
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_awards(
    target_year INTEGER DEFAULT NULL
)
RETURNS TABLE(
    category TEXT, medal TEXT, player_id UUID, player_name TEXT,
    value NUMERIC, partner_id UUID, partner_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    MIN_CAPS_REQUIRED CONSTANT INTEGER := 10;
    MIN_STREAK_REQUIRED CONSTANT INTEGER := 3;
    MIN_RESERVE_GAMES CONSTANT INTEGER := 5;
    MIN_RIVALRY_GAMES CONSTANT INTEGER := 5;
    MIN_TRIO_GAMES CONSTANT INTEGER := 3;
BEGIN
    -- Clear existing awards for this year (or all-time if NULL)
    DELETE FROM player_awards
    WHERE (target_year IS NULL AND award_year IS NULL)
       OR award_year = target_year;

    -- ========================================================================
    -- XP CHAMPION - Highest XP
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'xp_champion',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.xp
    FROM (
        SELECT
            p.id,
            COALESCE(px.xp, 0) as xp,
            ROW_NUMBER() OVER (ORDER BY COALESCE(px.xp, 0) DESC) as rank
        FROM players p
        LEFT JOIN player_xp px ON p.id = px.player_id
        WHERE (
            target_year IS NULL
            OR EXISTS (
                SELECT 1 FROM game_registrations gr
                JOIN games g ON gr.game_id = g.id
                WHERE gr.player_id = p.id
                AND gr.status = 'selected'
                AND EXTRACT(YEAR FROM g.date) = target_year
            )
        )
        AND COALESCE(px.xp, 0) > 0
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- WIN RATE LEADER - Best win percentage (min 10 games with outcomes)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'win_rate_leader',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.win_rate
    FROM (
        SELECT
            wr.id,
            wr.win_rate,
            ROW_NUMBER() OVER (ORDER BY wr.win_rate DESC) as rank
        FROM get_player_win_rates(target_year) wr
        WHERE wr.games_with_outcome >= MIN_CAPS_REQUIRED
        AND wr.win_rate IS NOT NULL
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- GOAL MACHINE - Best goal differential (min 10 caps)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'goal_machine',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.goal_differential
    FROM (
        SELECT
            gd.id,
            gd.goal_differential,
            ROW_NUMBER() OVER (ORDER BY gd.goal_differential DESC) as rank
        FROM get_player_goal_differentials(target_year) gd
        WHERE gd.caps >= MIN_CAPS_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- IRON MAN - Longest attendance streak
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'iron_man',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.max_streak
    FROM (
        SELECT
            s.id,
            s.max_streak,
            ROW_NUMBER() OVER (ORDER BY s.max_streak DESC) as rank
        FROM get_player_attendance_streaks(target_year) s
        WHERE s.max_streak >= 1
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- HOT STREAK - Longest win streak (min 3 games)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'hot_streak',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.max_streak
    FROM (
        SELECT
            s.id,
            s.max_streak,
            ROW_NUMBER() OVER (ORDER BY s.max_streak DESC) as rank
        FROM get_player_winning_streaks(target_year) s
        WHERE s.max_streak >= MIN_STREAK_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- THE WALL - Longest unbeaten streak (min 3 games)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'the_wall',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.max_streak
    FROM (
        SELECT
            s.id,
            s.max_streak,
            ROW_NUMBER() OVER (ORDER BY s.max_streak DESC) as rank
        FROM get_player_unbeaten_streaks(target_year) s
        WHERE s.max_streak >= MIN_STREAK_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- APPEARANCE KING - Most caps (games played)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'appearance_king',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.caps
    FROM (
        SELECT
            c.id,
            c.caps,
            ROW_NUMBER() OVER (ORDER BY c.caps DESC) as rank
        FROM get_player_caps(target_year) c
        WHERE c.caps >= 1
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- DYNAMIC DUO - Best chemistry pair (min 10 games together)
    -- (Renamed from DREAM_TEAM to distinguish from trio)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id)
    SELECT
        ranked.player1_id,
        'dynamic_duo',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.chemistry_score,
        ranked.player2_id
    FROM (
        SELECT
            c.player1_id,
            c.player2_id,
            c.chemistry_score,
            ROW_NUMBER() OVER (ORDER BY c.chemistry_score DESC) as rank
        FROM get_player_chemistry(NULL, target_year) c
        WHERE c.games_together >= MIN_CAPS_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3;

    -- Also insert the partner as award recipient
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id)
    SELECT
        ranked.player2_id,
        'dynamic_duo',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.chemistry_score,
        ranked.player1_id
    FROM (
        SELECT
            c.player1_id,
            c.player2_id,
            c.chemistry_score,
            ROW_NUMBER() OVER (ORDER BY c.chemistry_score DESC) as rank
        FROM get_player_chemistry(NULL, target_year) c
        WHERE c.games_together >= MIN_CAPS_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3
    ON CONFLICT (player_id, award_category, award_year, medal_type) DO NOTHING;

    -- ========================================================================
    -- BEST BUDDIES - Most games played together (min 10 games)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id)
    SELECT
        ranked.player1_id,
        'best_buddies',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.games_together,
        ranked.player2_id
    FROM (
        SELECT
            b.player1_id,
            b.player2_id,
            b.games_together,
            ROW_NUMBER() OVER (ORDER BY b.games_together DESC) as rank
        FROM get_best_buddies(target_year) b
        WHERE b.games_together >= MIN_CAPS_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3;

    -- Also insert the partner as award recipient
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id)
    SELECT
        ranked.player2_id,
        'best_buddies',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.games_together,
        ranked.player1_id
    FROM (
        SELECT
            b.player1_id,
            b.player2_id,
            b.games_together,
            ROW_NUMBER() OVER (ORDER BY b.games_together DESC) as rank
        FROM get_best_buddies(target_year) b
        WHERE b.games_together >= MIN_CAPS_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3
    ON CONFLICT (player_id, award_category, award_year, medal_type) DO NOTHING;

    -- ========================================================================
    -- FIERCEST RIVALRY - Most lopsided head-to-head (min 5 games)
    -- Both winner and loser get the award (it's their rivalry together)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id)
    SELECT
        ranked.player1_id,
        'fiercest_rivalry',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.win_percentage,  -- Store the dominant player's win %
        ranked.player2_id
    FROM (
        SELECT
            r.player1_id,
            r.player2_id,
            r.win_percentage,
            r.dominance_score,
            ROW_NUMBER() OVER (ORDER BY r.dominance_score DESC) as rank
        FROM get_rivalry_leaderboard(10, target_year) r
        WHERE r.games_against >= MIN_RIVALRY_GAMES
    ) ranked
    WHERE ranked.rank <= 3;

    -- Also insert the dominated player as award recipient
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id)
    SELECT
        ranked.player2_id,
        'fiercest_rivalry',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        100 - ranked.win_percentage,  -- Store their win % (inverse)
        ranked.player1_id
    FROM (
        SELECT
            r.player1_id,
            r.player2_id,
            r.win_percentage,
            r.dominance_score,
            ROW_NUMBER() OVER (ORDER BY r.dominance_score DESC) as rank
        FROM get_rivalry_leaderboard(10, target_year) r
        WHERE r.games_against >= MIN_RIVALRY_GAMES
    ) ranked
    WHERE ranked.rank <= 3
    ON CONFLICT (player_id, award_category, award_year, medal_type) DO NOTHING;

    -- ========================================================================
    -- DREAM TEAM TRIO - Best trio chemistry (min 3 games together)
    -- All 3 players get the award
    -- ========================================================================
    -- Player 1 gets award with partners 2 and 3
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id, partner2_id)
    SELECT
        ranked.player1_id,
        'dream_team_trio',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.trio_score,
        ranked.player2_id,
        ranked.player3_id
    FROM (
        SELECT
            t.player1_id,
            t.player2_id,
            t.player3_id,
            t.trio_score,
            ROW_NUMBER() OVER (ORDER BY t.trio_score DESC) as rank
        FROM get_trio_leaderboard(10, target_year, 'best') t
        WHERE t.games_together >= MIN_TRIO_GAMES
    ) ranked
    WHERE ranked.rank <= 3;

    -- Player 2 gets award with partners 1 and 3
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id, partner2_id)
    SELECT
        ranked.player2_id,
        'dream_team_trio',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.trio_score,
        ranked.player1_id,
        ranked.player3_id
    FROM (
        SELECT
            t.player1_id,
            t.player2_id,
            t.player3_id,
            t.trio_score,
            ROW_NUMBER() OVER (ORDER BY t.trio_score DESC) as rank
        FROM get_trio_leaderboard(10, target_year, 'best') t
        WHERE t.games_together >= MIN_TRIO_GAMES
    ) ranked
    WHERE ranked.rank <= 3
    ON CONFLICT (player_id, award_category, award_year, medal_type) DO NOTHING;

    -- Player 3 gets award with partners 1 and 2
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id, partner2_id)
    SELECT
        ranked.player3_id,
        'dream_team_trio',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.trio_score,
        ranked.player1_id,
        ranked.player2_id
    FROM (
        SELECT
            t.player1_id,
            t.player2_id,
            t.player3_id,
            t.trio_score,
            ROW_NUMBER() OVER (ORDER BY t.trio_score DESC) as rank
        FROM get_trio_leaderboard(10, target_year, 'best') t
        WHERE t.games_together >= MIN_TRIO_GAMES
    ) ranked
    WHERE ranked.rank <= 3
    ON CONFLICT (player_id, award_category, award_year, medal_type) DO NOTHING;

    -- ========================================================================
    -- BLUE BLOOD - Highest % on blue team (min 10 caps)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'blue_blood',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.blue_percentage
    FROM (
        SELECT
            tc.id,
            tc.blue_percentage,
            ROW_NUMBER() OVER (ORDER BY tc.blue_percentage DESC) as rank
        FROM get_player_team_colors(target_year) tc
        WHERE tc.caps >= MIN_CAPS_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- ORANGE CRUSH - Highest % on orange team (min 10 caps)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.id,
        'orange_crush',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.orange_percentage
    FROM (
        SELECT
            tc.id,
            tc.orange_percentage,
            ROW_NUMBER() OVER (ORDER BY tc.orange_percentage DESC) as rank
        FROM get_player_team_colors(target_year) tc
        WHERE tc.caps >= MIN_CAPS_REQUIRED
    ) ranked
    WHERE ranked.rank <= 3;

    -- ========================================================================
    -- SUPER SUB - Most reserve appearances (min 5 reserve games)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value)
    SELECT
        ranked.player_id,
        'super_sub',
        CASE ranked.rank
            WHEN 1 THEN 'gold'
            WHEN 2 THEN 'silver'
            WHEN 3 THEN 'bronze'
        END,
        target_year,
        ranked.reserve_count
    FROM (
        SELECT
            gr.player_id,
            COUNT(*) as reserve_count,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
        FROM game_registrations gr
        JOIN games g ON gr.game_id = g.id
        WHERE gr.status = 'reserve'
        AND g.completed = true
        AND (target_year IS NULL OR EXTRACT(YEAR FROM g.date) = target_year)
        GROUP BY gr.player_id
        HAVING COUNT(*) >= MIN_RESERVE_GAMES
    ) ranked
    WHERE ranked.rank <= 3;

    -- Return all inserted awards
    RETURN QUERY
    SELECT
        pa.award_category as category,
        pa.medal_type as medal,
        pa.player_id,
        p.friendly_name as player_name,
        pa.value,
        pa.partner_id,
        partner.friendly_name as partner_name
    FROM player_awards pa
    JOIN players p ON pa.player_id = p.id
    LEFT JOIN players partner ON pa.partner_id = partner.id
    WHERE (target_year IS NULL AND pa.award_year IS NULL)
       OR pa.award_year = target_year
    ORDER BY pa.award_category, pa.medal_type;
END;
$$;

-- ============================================================================
-- Step 4: Update get_awards_by_year to include partner2
-- ============================================================================
CREATE OR REPLACE FUNCTION get_awards_by_year(
    target_year INTEGER DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    player_id UUID,
    player_name TEXT,
    award_category TEXT,
    medal_type TEXT,
    award_year INTEGER,
    value NUMERIC,
    partner_id UUID,
    partner_name TEXT,
    partner2_id UUID,
    partner2_name TEXT,
    awarded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.id,
        pa.player_id,
        p.friendly_name as player_name,
        pa.award_category,
        pa.medal_type,
        pa.award_year,
        pa.value,
        pa.partner_id,
        partner.friendly_name as partner_name,
        pa.partner2_id,
        partner2.friendly_name as partner2_name,
        pa.awarded_at
    FROM player_awards pa
    JOIN players p ON pa.player_id = p.id
    LEFT JOIN players partner ON pa.partner_id = partner.id
    LEFT JOIN players partner2 ON pa.partner2_id = partner2.id
    WHERE (target_year IS NULL AND pa.award_year IS NULL)
       OR pa.award_year = target_year
    ORDER BY
        pa.award_category,
        CASE pa.medal_type
            WHEN 'gold' THEN 1
            WHEN 'silver' THEN 2
            WHEN 'bronze' THEN 3
        END;
END;
$$;

-- ============================================================================
-- Step 5: Update get_player_trophies to include partner2
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_trophies(
    target_player_id UUID
)
RETURNS TABLE(
    id UUID,
    award_category TEXT,
    medal_type TEXT,
    award_year INTEGER,
    value NUMERIC,
    partner_id UUID,
    partner_name TEXT,
    partner2_id UUID,
    partner2_name TEXT,
    awarded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.id,
        pa.award_category,
        pa.medal_type,
        pa.award_year,
        pa.value,
        pa.partner_id,
        partner.friendly_name as partner_name,
        pa.partner2_id,
        partner2.friendly_name as partner2_name,
        pa.awarded_at
    FROM player_awards pa
    LEFT JOIN players partner ON pa.partner_id = partner.id
    LEFT JOIN players partner2 ON pa.partner2_id = partner2.id
    WHERE pa.player_id = target_player_id
    ORDER BY
        pa.award_year DESC NULLS FIRST,
        CASE pa.medal_type
            WHEN 'gold' THEN 1
            WHEN 'silver' THEN 2
            WHEN 'bronze' THEN 3
        END,
        pa.award_category;
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN player_awards.partner2_id IS 'Second partner ID for trio awards (dream_team_trio)';
