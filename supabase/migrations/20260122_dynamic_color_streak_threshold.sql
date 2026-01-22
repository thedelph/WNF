-- =====================================================
-- Dynamic Color Streak Threshold for team_color_switch
-- =====================================================
-- This migration introduces dynamic threshold calculation for the
-- team_color_switch insight. Instead of a hard-coded threshold of 5,
-- we now calculate the 95th percentile of all historical same-color
-- streaks. This ensures only the top 5% of streaks generate insights.
--
-- Example: If 95% of players switch teams within 6 games, only 7+ game
-- streaks will trigger the "Rare sight!" insight.
-- =====================================================

-- =====================================================
-- FUNCTION: get_color_streak_threshold()
-- Calculates the 95th percentile of same-color streaks
-- =====================================================
CREATE OR REPLACE FUNCTION get_color_streak_threshold()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_total_streaks INTEGER;
BEGIN
  -- Calculate 95th percentile of same-color streaks
  -- Only the top 5% of streaks will trigger team_color_switch insights
  WITH player_game_colors AS (
    -- Get each player's team color for each game they played
    SELECT
      gr.player_id,
      g.id as game_id,
      g.date,
      gr.team
    FROM game_registrations gr
    JOIN games g ON g.id = gr.game_id
    WHERE gr.status = 'selected'
      AND g.status = 'completed'
      AND gr.team IS NOT NULL
    ORDER BY gr.player_id, g.date
  ),
  streak_groups AS (
    -- Identify streak boundaries using LAG
    SELECT
      player_id,
      game_id,
      team,
      date,
      CASE
        WHEN team != LAG(team) OVER (PARTITION BY player_id ORDER BY date)
        THEN 1
        ELSE 0
      END as new_streak
    FROM player_game_colors
  ),
  streaks_numbered AS (
    -- Number each streak
    SELECT
      player_id,
      game_id,
      team,
      SUM(new_streak) OVER (PARTITION BY player_id ORDER BY date) as streak_id
    FROM streak_groups
  ),
  streak_lengths AS (
    -- Calculate length of each streak
    SELECT
      player_id,
      streak_id,
      COUNT(*) as streak_length
    FROM streaks_numbered
    GROUP BY player_id, streak_id
  )
  SELECT
    COALESCE(
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY streak_length)::INTEGER,
      5  -- Fallback default
    ),
    COUNT(*)
  INTO v_threshold, v_total_streaks
  FROM streak_lengths
  WHERE streak_length >= 2;  -- Only count meaningful streaks (2+ games)

  -- If we have very few streaks (new league), use default of 5
  IF v_total_streaks < 20 THEN
    RETURN 5;
  END IF;

  -- Ensure minimum threshold of 3 (a 2-game streak isn't notable)
  RETURN GREATEST(v_threshold, 3);
END;
$$;

COMMENT ON FUNCTION get_color_streak_threshold IS
'Calculates the dynamic threshold for team_color_switch insights.
Returns the 95th percentile of all historical same-color streaks,
ensuring that only the top 5% of team switches generate insights.
Falls back to 5 if insufficient data (<20 streaks).
Minimum threshold is 3 to avoid trivial insights.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_color_streak_threshold() TO authenticated;

-- =====================================================
-- UPDATE: _generate_team_color_insights()
-- Now uses dynamic threshold for team_color_switch
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_team_color_insights(
  p_game_id UUID,
  p_game RECORD,
  p_all_players UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_player RECORD;
  v_color_streak_threshold INTEGER;
BEGIN
  -- Get dynamic threshold for color streaks (cached for this execution)
  v_color_streak_threshold := get_color_streak_threshold();

  -- TEAM COLOR LOYALTY
  FOR v_player IN
    SELECT p.id, p.friendly_name, gr.team as current_team
    FROM players p
    JOIN game_registrations gr ON p.id = gr.player_id
    WHERE p.id = ANY(p_all_players)
      AND gr.game_id = p_game_id
      AND gr.status = 'selected'
  LOOP
    DECLARE
      v_total_games INTEGER;
      v_team_games INTEGER;
      v_loyalty_pct NUMERIC;
    BEGIN
      SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE gr.team = v_player.current_team)
      INTO v_total_games, v_team_games
      FROM game_registrations gr
      JOIN games g ON gr.game_id = g.id
      WHERE gr.player_id = v_player.id
        AND gr.status = 'selected'
        AND g.completed = true;

      IF v_total_games >= 20 THEN
        v_loyalty_pct := ROUND((v_team_games::NUMERIC / v_total_games) * 100, 0);

        IF v_loyalty_pct >= 70 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'team_color_loyalty', 5,
            format('True %s! %s has played %s %s%% of the time',
              CASE WHEN v_player.current_team = 'blue' THEN 'Blue' ELSE 'Orange' END,
              v_player.friendly_name,
              CASE WHEN v_player.current_team = 'blue' THEN 'Blue' ELSE 'Orange' END,
              v_loyalty_pct),
            jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name,
              'team', v_player.current_team, 'percentage', v_loyalty_pct, 'games', v_total_games),
            ARRAY[v_player.id]
          );
        END IF;
      END IF;
    END;
  END LOOP;

  -- TEAM COLOR SWITCH (now uses dynamic threshold)
  FOR v_player IN
    SELECT p.id, p.friendly_name, gr.team as current_team
    FROM players p
    JOIN game_registrations gr ON p.id = gr.player_id
    WHERE p.id = ANY(p_all_players)
      AND gr.game_id = p_game_id
      AND gr.status = 'selected'
  LOOP
    DECLARE
      v_other_team_streak INTEGER := 0;
      v_other_team TEXT;
    BEGIN
      v_other_team := CASE WHEN v_player.current_team = 'blue' THEN 'orange' ELSE 'blue' END;

      -- Count consecutive games on the OTHER team before this game
      SELECT COUNT(*) INTO v_other_team_streak
      FROM (
        SELECT gr.team
        FROM game_registrations gr
        JOIN games g ON gr.game_id = g.id
        WHERE gr.player_id = v_player.id
          AND gr.status = 'selected'
          AND g.completed = true
          AND g.sequence_number < p_game.sequence_number
        ORDER BY g.sequence_number DESC
        LIMIT 20  -- Reasonable upper bound for streak check
      ) recent
      WHERE recent.team = v_other_team;

      -- Use dynamic threshold instead of hard-coded 5
      IF v_other_team_streak >= v_color_streak_threshold THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'team_color_switch', 5,
          format('Rare sight! %s plays %s for first time in %s games',
            v_player.friendly_name,
            CASE WHEN v_player.current_team = 'blue' THEN 'Blue' ELSE 'Orange' END,
            v_other_team_streak + 1),
          jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name,
            'new_team', v_player.current_team, 'streak_on_other', v_other_team_streak,
            'threshold_used', v_color_streak_threshold),
          ARRAY[v_player.id]
        );
      END IF;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION _generate_team_color_insights IS
'Helper: generates team color loyalty and switch insights.
team_color_switch now uses dynamic threshold from get_color_streak_threshold()
(80th percentile of historical streaks) instead of hard-coded 5.';

-- =====================================================
-- DIAGNOSTIC QUERY: Check current threshold and distribution
-- =====================================================
-- Run this query to see the streak distribution and calculated threshold:
--
-- WITH player_game_colors AS (
--   SELECT gr.player_id, g.date, gr.team
--   FROM game_registrations gr
--   JOIN games g ON g.id = gr.game_id
--   WHERE gr.status = 'selected' AND g.status = 'completed' AND gr.team IS NOT NULL
--   ORDER BY gr.player_id, g.date
-- ),
-- streak_groups AS (
--   SELECT player_id, team, date,
--     CASE WHEN team != LAG(team) OVER (PARTITION BY player_id ORDER BY date) THEN 1 ELSE 0 END as new_streak
--   FROM player_game_colors
-- ),
-- streaks_numbered AS (
--   SELECT player_id, team, SUM(new_streak) OVER (PARTITION BY player_id ORDER BY date) as streak_id
--   FROM streak_groups
-- ),
-- streak_lengths AS (
--   SELECT player_id, streak_id, COUNT(*) as streak_length
--   FROM streaks_numbered
--   GROUP BY player_id, streak_id
-- )
-- SELECT
--   streak_length,
--   COUNT(*) as frequency,
--   ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct,
--   ROUND(100.0 * SUM(COUNT(*)) OVER (ORDER BY streak_length) / SUM(COUNT(*)) OVER (), 1) as cumulative_pct
-- FROM streak_lengths
-- WHERE streak_length >= 2
-- GROUP BY streak_length
-- ORDER BY streak_length;
--
-- Then compare with:
-- SELECT get_color_streak_threshold();
-- =====================================================

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- 1. Created get_color_streak_threshold() function that calculates
--    the 80th percentile of same-color streaks
-- 2. Updated _generate_team_color_insights() to use the dynamic threshold
-- 3. Added fallback to 5 for new leagues with insufficient data
-- 4. Minimum threshold of 3 to avoid trivial insights
-- =====================================================
