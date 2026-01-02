-- Migration: Create Awards System
-- Description: Creates tables and functions for player awards/trophies
-- Awards are calculated for each year and all-time, with Gold/Silver/Bronze medals
--
-- Award Categories:
--   Individual: xp_champion, win_rate_leader, goal_machine
--   Streaks: iron_man, hot_streak, the_wall, appearance_king
--   Team: dream_team, best_buddies
--   Specialist: blue_blood, orange_crush, super_sub

-- ============================================================================
-- Table: player_awards
-- Stores all awarded trophies for players
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    award_category TEXT NOT NULL,
    medal_type TEXT NOT NULL CHECK (medal_type IN ('gold', 'silver', 'bronze')),
    award_year INTEGER, -- NULL for all-time awards
    value NUMERIC NOT NULL, -- The metric value (XP amount, win rate %, etc.)
    partner_id UUID REFERENCES players(id) ON DELETE SET NULL, -- For pair awards
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique awards per player/category/year/medal
    CONSTRAINT unique_player_award UNIQUE (player_id, award_category, award_year, medal_type)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_player_awards_player_id ON player_awards(player_id);
CREATE INDEX IF NOT EXISTS idx_player_awards_category_year ON player_awards(award_category, award_year);
CREATE INDEX IF NOT EXISTS idx_player_awards_medal ON player_awards(medal_type);
CREATE INDEX IF NOT EXISTS idx_player_awards_year ON player_awards(award_year);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE player_awards ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read awards
CREATE POLICY "Allow authenticated users to read awards"
ON player_awards FOR SELECT
TO authenticated
USING (true);

-- Allow anon users to read awards (for public awards page)
CREATE POLICY "Allow anon users to read awards"
ON player_awards FOR SELECT
TO anon
USING (true);

-- Only allow service role to insert/update/delete (admin functions)
CREATE POLICY "Allow service role to manage awards"
ON player_awards FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Function: calculate_awards
-- Main function to calculate and store awards for a specific year or all-time
-- Uses existing RPC functions for consistent stat calculations
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_awards(
    target_year INTEGER DEFAULT NULL -- NULL for all-time
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
            -- For year-specific, check they played that year
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
    -- DREAM TEAM - Best chemistry pair (min 10 games together)
    -- ========================================================================
    INSERT INTO player_awards (player_id, award_category, medal_type, award_year, value, partner_id)
    SELECT
        ranked.player1_id,
        'dream_team',
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
        'dream_team',
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
-- Function: get_awards_by_year
-- Returns all awards for a specific year or all-time
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
        pa.awarded_at
    FROM player_awards pa
    JOIN players p ON pa.player_id = p.id
    LEFT JOIN players partner ON pa.partner_id = partner.id
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
-- Function: get_player_trophies
-- Returns all awards for a specific player
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
        pa.awarded_at
    FROM player_awards pa
    LEFT JOIN players partner ON pa.partner_id = partner.id
    WHERE pa.player_id = target_player_id
    ORDER BY
        pa.award_year DESC NULLS FIRST, -- All-time first
        CASE pa.medal_type
            WHEN 'gold' THEN 1
            WHEN 'silver' THEN 2
            WHEN 'bronze' THEN 3
        END,
        pa.award_category;
END;
$$;

-- ============================================================================
-- Function: get_player_trophy_counts
-- Returns trophy counts by medal type for a player
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_trophy_counts(
    target_player_id UUID
)
RETURNS TABLE(
    total_count BIGINT,
    gold_count BIGINT,
    silver_count BIGINT,
    bronze_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE pa.medal_type = 'gold') as gold_count,
        COUNT(*) FILTER (WHERE pa.medal_type = 'silver') as silver_count,
        COUNT(*) FILTER (WHERE pa.medal_type = 'bronze') as bronze_count
    FROM player_awards pa
    WHERE pa.player_id = target_player_id;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION calculate_awards(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_awards_by_year(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_player_trophies(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_player_trophy_counts(UUID) TO authenticated, anon;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE player_awards IS 'Stores player awards/trophies with medal types (gold, silver, bronze) for yearly and all-time achievements.';
COMMENT ON FUNCTION calculate_awards IS 'Calculates and stores awards for a specific year (or all-time if NULL). Clears existing awards before recalculating.';
COMMENT ON FUNCTION get_awards_by_year IS 'Returns all awards for a specific year or all-time (NULL).';
COMMENT ON FUNCTION get_player_trophies IS 'Returns all trophies earned by a specific player.';
COMMENT ON FUNCTION get_player_trophy_counts IS 'Returns trophy counts (total, gold, silver, bronze) for a player.';
