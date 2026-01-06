-- Migration: Add Rivalry and Trio Chemistry UI RPCs
-- Description: Creates RPC functions for displaying rivalry and trio chemistry
-- in leaderboards and player profiles.
--
-- RPCs created:
--   1. get_rivalry_leaderboard - Top lopsided rivalries for leaderboard
--   2. get_player_rivals - Player's best/worst matchups
--   3. get_player_pair_rivalry - Two-player rivalry stats (personal head-to-head)
--   4. get_trio_leaderboard - Best/worst trios for leaderboard
--   5. get_player_best_trios - Player's best trio combinations

-- ============================================================================
-- Function: get_rivalry_leaderboard
-- Returns top N most lopsided rivalries for the leaderboard
-- Sorted by how far the rivalry score deviates from 50 (neutral)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_rivalry_leaderboard(
    limit_count INTEGER DEFAULT 10,
    target_year INTEGER DEFAULT NULL
)
RETURNS TABLE(
    player1_id UUID,
    player1_name TEXT,
    player2_id UUID,
    player2_name TEXT,
    games_against BIGINT,
    player1_wins BIGINT,
    player2_wins BIGINT,
    draws BIGINT,
    win_percentage NUMERIC,  -- Winner's win % (always >= 50)
    dominance_score NUMERIC  -- How lopsided (0-50, higher = more lopsided)
)
LANGUAGE plpgsql
AS $$
DECLARE
    MIN_GAMES CONSTANT INTEGER := 5; -- Minimum games threshold
BEGIN
    RETURN QUERY
    WITH opposite_team_games AS (
        SELECT
            LEAST(gr1.player_id, gr2.player_id) as p1_id,
            GREATEST(gr1.player_id, gr2.player_id) as p2_id,
            gr1.game_id,
            g.outcome,
            CASE
                WHEN g.outcome = 'draw' THEN 'draw'
                WHEN (
                    (gr1.player_id < gr2.player_id AND gr1.team = 'blue' AND g.outcome = 'blue_win')
                    OR (gr1.player_id < gr2.player_id AND gr1.team = 'orange' AND g.outcome = 'orange_win')
                    OR (gr1.player_id > gr2.player_id AND gr2.team = 'blue' AND g.outcome = 'blue_win')
                    OR (gr1.player_id > gr2.player_id AND gr2.team = 'orange' AND g.outcome = 'orange_win')
                ) THEN 'player1_win'
                ELSE 'player2_win'
            END as result
        FROM game_registrations gr1
        JOIN game_registrations gr2
            ON gr1.game_id = gr2.game_id
            AND gr1.team != gr2.team
            AND gr1.player_id < gr2.player_id
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.status = 'selected'
        AND gr2.status = 'selected'
        AND g.outcome IS NOT NULL
        AND (target_year IS NULL OR EXTRACT(YEAR FROM g.date) = target_year)
    ),
    pair_stats AS (
        SELECT
            otg.p1_id,
            otg.p2_id,
            COUNT(DISTINCT otg.game_id) as total_games,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'player1_win') as p1_wins,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'player2_win') as p2_wins,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'draw') as total_draws
        FROM opposite_team_games otg
        GROUP BY otg.p1_id, otg.p2_id
        HAVING COUNT(DISTINCT otg.game_id) >= MIN_GAMES
    ),
    scored_pairs AS (
        SELECT
            ps.p1_id,
            ps.p2_id,
            ps.total_games,
            ps.p1_wins,
            ps.p2_wins,
            ps.total_draws,
            -- Win percentage of the dominant player (always >= 50)
            CASE
                WHEN (ps.p1_wins + ps.p2_wins) > 0 THEN
                    GREATEST(ps.p1_wins, ps.p2_wins)::NUMERIC / (ps.p1_wins + ps.p2_wins)::NUMERIC * 100
                ELSE 50.0
            END as winner_pct,
            -- Dominance score: how far from 50% (0-50 scale)
            CASE
                WHEN (ps.p1_wins + ps.p2_wins) > 0 THEN
                    ABS(50.0 - (ps.p1_wins::NUMERIC / (ps.p1_wins + ps.p2_wins)::NUMERIC * 100))
                ELSE 0.0
            END as dom_score,
            -- Track who dominates for proper ordering
            ps.p1_wins > ps.p2_wins as p1_dominates
        FROM pair_stats ps
    )
    SELECT
        -- Put dominant player first for display
        CASE WHEN sp.p1_dominates THEN sp.p1_id ELSE sp.p2_id END as player1_id,
        CASE WHEN sp.p1_dominates THEN p1.friendly_name ELSE p2.friendly_name END as player1_name,
        CASE WHEN sp.p1_dominates THEN sp.p2_id ELSE sp.p1_id END as player2_id,
        CASE WHEN sp.p1_dominates THEN p2.friendly_name ELSE p1.friendly_name END as player2_name,
        sp.total_games as games_against,
        CASE WHEN sp.p1_dominates THEN sp.p1_wins ELSE sp.p2_wins END as player1_wins,
        CASE WHEN sp.p1_dominates THEN sp.p2_wins ELSE sp.p1_wins END as player2_wins,
        sp.total_draws as draws,
        ROUND(sp.winner_pct, 1) as win_percentage,
        ROUND(sp.dom_score, 1) as dominance_score
    FROM scored_pairs sp
    JOIN players p1 ON p1.id = sp.p1_id
    JOIN players p2 ON p2.id = sp.p2_id
    ORDER BY sp.dom_score DESC, sp.total_games DESC
    LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_rivalry_leaderboard(INTEGER, INTEGER) TO authenticated, anon;
COMMENT ON FUNCTION get_rivalry_leaderboard IS 'Returns top N most lopsided rivalries for leaderboard display. Sorted by dominance score.';


-- ============================================================================
-- Function: get_player_rivals
-- Returns rivals for a specific player, split into who they dominate and who dominates them
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_rivals(
    target_player_id UUID,
    limit_count INTEGER DEFAULT 3,
    target_year INTEGER DEFAULT NULL
)
RETURNS TABLE(
    opponent_id UUID,
    opponent_name TEXT,
    games_against BIGINT,
    player_wins BIGINT,
    opponent_wins BIGINT,
    draws BIGINT,
    win_percentage NUMERIC,  -- Target player's win percentage
    dominance_type TEXT      -- 'dominates', 'dominated_by', or 'even'
)
LANGUAGE plpgsql
AS $$
DECLARE
    MIN_GAMES CONSTANT INTEGER := 5;
BEGIN
    RETURN QUERY
    WITH opposite_team_games AS (
        SELECT
            CASE
                WHEN gr1.player_id = target_player_id THEN gr2.player_id
                ELSE gr1.player_id
            END as opp_id,
            gr1.game_id,
            g.outcome,
            gr1.team as player_team,
            CASE
                WHEN g.outcome = 'draw' THEN 'draw'
                WHEN (
                    (gr1.player_id = target_player_id AND gr1.team = 'blue' AND g.outcome = 'blue_win')
                    OR (gr1.player_id = target_player_id AND gr1.team = 'orange' AND g.outcome = 'orange_win')
                    OR (gr2.player_id = target_player_id AND gr2.team = 'blue' AND g.outcome = 'blue_win')
                    OR (gr2.player_id = target_player_id AND gr2.team = 'orange' AND g.outcome = 'orange_win')
                ) THEN 'player_win'
                ELSE 'opponent_win'
            END as result
        FROM game_registrations gr1
        JOIN game_registrations gr2
            ON gr1.game_id = gr2.game_id
            AND gr1.team != gr2.team
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.status = 'selected'
        AND gr2.status = 'selected'
        AND g.outcome IS NOT NULL
        AND (target_year IS NULL OR EXTRACT(YEAR FROM g.date) = target_year)
        AND (gr1.player_id = target_player_id OR gr2.player_id = target_player_id)
        AND gr1.player_id != gr2.player_id
    ),
    opponent_stats AS (
        SELECT
            otg.opp_id,
            COUNT(DISTINCT otg.game_id) as total_games,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'player_win') as p_wins,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'opponent_win') as o_wins,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'draw') as total_draws
        FROM opposite_team_games otg
        GROUP BY otg.opp_id
        HAVING COUNT(DISTINCT otg.game_id) >= MIN_GAMES
    ),
    scored_opponents AS (
        SELECT
            os.opp_id,
            os.total_games,
            os.p_wins,
            os.o_wins,
            os.total_draws,
            CASE
                WHEN (os.p_wins + os.o_wins) > 0 THEN
                    ROUND(os.p_wins::NUMERIC / (os.p_wins + os.o_wins)::NUMERIC * 100, 1)
                ELSE 50.0
            END as win_pct,
            CASE
                WHEN os.p_wins > os.o_wins THEN 'dominates'
                WHEN os.o_wins > os.p_wins THEN 'dominated_by'
                ELSE 'even'
            END as dom_type
        FROM opponent_stats os
    )
    SELECT
        so.opp_id as opponent_id,
        p.friendly_name as opponent_name,
        so.total_games as games_against,
        so.p_wins as player_wins,
        so.o_wins as opponent_wins,
        so.total_draws as draws,
        so.win_pct as win_percentage,
        so.dom_type as dominance_type
    FROM scored_opponents so
    JOIN players p ON p.id = so.opp_id
    ORDER BY
        -- Sort: dominates first (desc by win%), then dominated_by (asc by win%)
        CASE
            WHEN so.dom_type = 'dominates' THEN 1
            WHEN so.dom_type = 'even' THEN 2
            ELSE 3
        END,
        CASE
            WHEN so.dom_type = 'dominates' THEN -so.win_pct
            ELSE so.win_pct
        END,
        so.total_games DESC
    LIMIT limit_count * 2;  -- Return enough for both dominates and dominated_by lists
END;
$$;

GRANT EXECUTE ON FUNCTION get_player_rivals(UUID, INTEGER, INTEGER) TO authenticated, anon;
COMMENT ON FUNCTION get_player_rivals IS 'Returns rivals for a specific player with dominance type classification.';


-- ============================================================================
-- Function: get_player_pair_rivalry
-- Returns rivalry stats between two specific players (for personal head-to-head)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_pair_rivalry(
    player_one_id UUID,
    player_two_id UUID
)
RETURNS TABLE(
    games_against BIGINT,
    player1_wins BIGINT,
    player2_wins BIGINT,
    draws BIGINT,
    player1_win_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH opposite_team_games AS (
        SELECT
            gr1.game_id,
            g.outcome,
            CASE
                WHEN g.outcome = 'draw' THEN 'draw'
                WHEN (gr1.player_id = player_one_id AND gr1.team = 'blue' AND g.outcome = 'blue_win')
                  OR (gr1.player_id = player_one_id AND gr1.team = 'orange' AND g.outcome = 'orange_win')
                THEN 'player1_win'
                ELSE 'player2_win'
            END as result
        FROM game_registrations gr1
        JOIN game_registrations gr2
            ON gr1.game_id = gr2.game_id
            AND gr1.team != gr2.team
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.status = 'selected'
        AND gr2.status = 'selected'
        AND g.outcome IS NOT NULL
        AND (
            (gr1.player_id = player_one_id AND gr2.player_id = player_two_id)
            OR (gr1.player_id = player_two_id AND gr2.player_id = player_one_id)
        )
    ),
    pair_stats AS (
        SELECT
            COUNT(DISTINCT otg.game_id) as total_games,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'player1_win') as p1_wins,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'player2_win') as p2_wins,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'draw') as total_draws
        FROM opposite_team_games otg
    )
    SELECT
        ps.total_games as games_against,
        ps.p1_wins as player1_wins,
        ps.p2_wins as player2_wins,
        ps.total_draws as draws,
        CASE
            WHEN (ps.p1_wins + ps.p2_wins) > 0 THEN
                ROUND(ps.p1_wins::NUMERIC / (ps.p1_wins + ps.p2_wins)::NUMERIC * 100, 1)
            ELSE 50.0
        END as player1_win_percentage
    FROM pair_stats ps;
END;
$$;

GRANT EXECUTE ON FUNCTION get_player_pair_rivalry(UUID, UUID) TO authenticated, anon;
COMMENT ON FUNCTION get_player_pair_rivalry IS 'Returns rivalry stats between two specific players when on opposite teams.';


-- ============================================================================
-- Function: get_trio_leaderboard
-- Returns top/bottom N trios by win rate for leaderboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_trio_leaderboard(
    limit_count INTEGER DEFAULT 10,
    target_year INTEGER DEFAULT NULL,
    sort_order TEXT DEFAULT 'best'  -- 'best' or 'worst'
)
RETURNS TABLE(
    player1_id UUID,
    player1_name TEXT,
    player2_id UUID,
    player2_name TEXT,
    player3_id UUID,
    player3_name TEXT,
    games_together BIGINT,
    wins BIGINT,
    draws BIGINT,
    losses BIGINT,
    win_rate NUMERIC,
    trio_score NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    K_VALUE CONSTANT NUMERIC := 10;
    MIN_GAMES CONSTANT INTEGER := 3;
BEGIN
    RETURN QUERY
    WITH trio_games AS (
        SELECT
            LEAST(gr1.player_id, gr2.player_id, gr3.player_id) as p1_id,
            CASE
                WHEN gr1.player_id != LEAST(gr1.player_id, gr2.player_id, gr3.player_id)
                     AND gr1.player_id != GREATEST(gr1.player_id, gr2.player_id, gr3.player_id)
                THEN gr1.player_id
                WHEN gr2.player_id != LEAST(gr1.player_id, gr2.player_id, gr3.player_id)
                     AND gr2.player_id != GREATEST(gr1.player_id, gr2.player_id, gr3.player_id)
                THEN gr2.player_id
                ELSE gr3.player_id
            END as p2_id,
            GREATEST(gr1.player_id, gr2.player_id, gr3.player_id) as p3_id,
            gr1.game_id,
            gr1.team,
            g.outcome,
            CASE
                WHEN g.outcome = 'draw' THEN 'draw'
                WHEN (gr1.team = 'blue' AND g.outcome = 'blue_win')
                  OR (gr1.team = 'orange' AND g.outcome = 'orange_win')
                THEN 'win'
                ELSE 'loss'
            END as result
        FROM game_registrations gr1
        JOIN game_registrations gr2
            ON gr1.game_id = gr2.game_id
            AND gr1.team = gr2.team
            AND gr1.player_id < gr2.player_id
        JOIN game_registrations gr3
            ON gr1.game_id = gr3.game_id
            AND gr1.team = gr3.team
            AND gr2.player_id < gr3.player_id
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.status = 'selected'
        AND gr2.status = 'selected'
        AND gr3.status = 'selected'
        AND g.outcome IS NOT NULL
        AND (target_year IS NULL OR EXTRACT(YEAR FROM g.date) = target_year)
    ),
    trio_stats AS (
        SELECT
            tg.p1_id,
            tg.p2_id,
            tg.p3_id,
            COUNT(DISTINCT tg.game_id) as total_games,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'win') as total_wins,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'draw') as total_draws,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'loss') as total_losses
        FROM trio_games tg
        GROUP BY tg.p1_id, tg.p2_id, tg.p3_id
        HAVING COUNT(DISTINCT tg.game_id) >= MIN_GAMES
    ),
    scored_trios AS (
        SELECT
            ts.p1_id,
            ts.p2_id,
            ts.p3_id,
            ts.total_games,
            ts.total_wins,
            ts.total_draws,
            ts.total_losses,
            ROUND(
                (ts.total_wins * 3 + ts.total_draws * 1)::NUMERIC
                / (ts.total_games * 3)::NUMERIC * 100,
                1
            ) as wr,
            ROUND(
                ((ts.total_wins * 3 + ts.total_draws * 1)::NUMERIC
                 / (ts.total_games * 3)::NUMERIC * 100)
                * (ts.total_games::NUMERIC / (ts.total_games + K_VALUE)),
                1
            ) as t_score
        FROM trio_stats ts
    )
    SELECT
        st.p1_id as player1_id,
        p1.friendly_name as player1_name,
        st.p2_id as player2_id,
        p2.friendly_name as player2_name,
        st.p3_id as player3_id,
        p3.friendly_name as player3_name,
        st.total_games as games_together,
        st.total_wins as wins,
        st.total_draws as draws,
        st.total_losses as losses,
        st.wr as win_rate,
        st.t_score as trio_score
    FROM scored_trios st
    JOIN players p1 ON p1.id = st.p1_id
    JOIN players p2 ON p2.id = st.p2_id
    JOIN players p3 ON p3.id = st.p3_id
    ORDER BY
        CASE WHEN sort_order = 'best' THEN -st.t_score ELSE st.t_score END,
        st.total_games DESC
    LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trio_leaderboard(INTEGER, INTEGER, TEXT) TO authenticated, anon;
COMMENT ON FUNCTION get_trio_leaderboard IS 'Returns top/bottom trios for leaderboard. Use sort_order=best for dream teams, sort_order=worst for cursed trios.';


-- ============================================================================
-- Function: get_player_best_trios
-- Returns best trio combinations for a specific player
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_best_trios(
    target_player_id UUID,
    limit_count INTEGER DEFAULT 3,
    target_year INTEGER DEFAULT NULL
)
RETURNS TABLE(
    partner1_id UUID,
    partner1_name TEXT,
    partner2_id UUID,
    partner2_name TEXT,
    games_together BIGINT,
    wins BIGINT,
    draws BIGINT,
    losses BIGINT,
    win_rate NUMERIC,
    trio_score NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    K_VALUE CONSTANT NUMERIC := 10;
    MIN_GAMES CONSTANT INTEGER := 3;
BEGIN
    RETURN QUERY
    WITH trio_games AS (
        SELECT
            CASE
                WHEN gr1.player_id = target_player_id THEN gr2.player_id
                WHEN gr2.player_id = target_player_id THEN gr1.player_id
                ELSE gr1.player_id
            END as partner1,
            CASE
                WHEN gr1.player_id = target_player_id THEN gr3.player_id
                WHEN gr2.player_id = target_player_id THEN gr3.player_id
                ELSE gr2.player_id
            END as partner2,
            gr1.game_id,
            gr1.team,
            g.outcome,
            CASE
                WHEN g.outcome = 'draw' THEN 'draw'
                WHEN (gr1.team = 'blue' AND g.outcome = 'blue_win')
                  OR (gr1.team = 'orange' AND g.outcome = 'orange_win')
                THEN 'win'
                ELSE 'loss'
            END as result
        FROM game_registrations gr1
        JOIN game_registrations gr2
            ON gr1.game_id = gr2.game_id
            AND gr1.team = gr2.team
            AND gr1.player_id < gr2.player_id
        JOIN game_registrations gr3
            ON gr1.game_id = gr3.game_id
            AND gr1.team = gr3.team
            AND gr2.player_id < gr3.player_id
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.status = 'selected'
        AND gr2.status = 'selected'
        AND gr3.status = 'selected'
        AND g.outcome IS NOT NULL
        AND (target_year IS NULL OR EXTRACT(YEAR FROM g.date) = target_year)
        AND (gr1.player_id = target_player_id
             OR gr2.player_id = target_player_id
             OR gr3.player_id = target_player_id)
    ),
    trio_stats AS (
        SELECT
            LEAST(tg.partner1, tg.partner2) as p1,
            GREATEST(tg.partner1, tg.partner2) as p2,
            COUNT(DISTINCT tg.game_id) as total_games,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'win') as total_wins,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'draw') as total_draws,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'loss') as total_losses
        FROM trio_games tg
        GROUP BY LEAST(tg.partner1, tg.partner2), GREATEST(tg.partner1, tg.partner2)
        HAVING COUNT(DISTINCT tg.game_id) >= MIN_GAMES
    ),
    scored_trios AS (
        SELECT
            ts.p1,
            ts.p2,
            ts.total_games,
            ts.total_wins,
            ts.total_draws,
            ts.total_losses,
            ROUND(
                (ts.total_wins * 3 + ts.total_draws * 1)::NUMERIC
                / (ts.total_games * 3)::NUMERIC * 100,
                1
            ) as wr,
            ROUND(
                ((ts.total_wins * 3 + ts.total_draws * 1)::NUMERIC
                 / (ts.total_games * 3)::NUMERIC * 100)
                * (ts.total_games::NUMERIC / (ts.total_games + K_VALUE)),
                1
            ) as t_score
        FROM trio_stats ts
    )
    SELECT
        st.p1 as partner1_id,
        p1.friendly_name as partner1_name,
        st.p2 as partner2_id,
        p2.friendly_name as partner2_name,
        st.total_games as games_together,
        st.total_wins as wins,
        st.total_draws as draws,
        st.total_losses as losses,
        st.wr as win_rate,
        st.t_score as trio_score
    FROM scored_trios st
    JOIN players p1 ON p1.id = st.p1
    JOIN players p2 ON p2.id = st.p2
    ORDER BY st.t_score DESC, st.total_games DESC
    LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_player_best_trios(UUID, INTEGER, INTEGER) TO authenticated, anon;
COMMENT ON FUNCTION get_player_best_trios IS 'Returns best trio combinations for a specific player.';
