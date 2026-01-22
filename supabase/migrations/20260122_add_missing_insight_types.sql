-- =====================================================
-- Add Missing Insight Types with Dynamic Percentile Thresholds
-- =====================================================
-- This migration implements 5 new insight types:
-- 1. low_scoring_game (10th percentile of total goals)
-- 2. team_best_score (95th percentile of team scores for current year)
-- 3. team_color_dominance (80th percentile of dominance in 7-game windows)
-- 4. team_color_streak_broken (80th percentile of team winning streaks)
-- 5. player_color_curse (95th percentile of win rate differences)
-- =====================================================

-- =====================================================
-- THRESHOLD FUNCTION 1: get_low_scoring_game_threshold()
-- Calculates the 10th percentile (BOTTOM 10%) of total goals
-- =====================================================
CREATE OR REPLACE FUNCTION get_low_scoring_game_threshold()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_total_games INTEGER;
BEGIN
  -- Calculate 10th percentile of total goals (bottom 10% of games)
  WITH game_goals AS (
    SELECT
      COALESCE(score_blue, 0) + COALESCE(score_orange, 0) as total_goals
    FROM games
    WHERE completed = true
      AND score_blue IS NOT NULL
      AND score_orange IS NOT NULL
  )
  SELECT
    COALESCE(
      PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY total_goals)::INTEGER,
      5  -- Fallback default
    ),
    COUNT(*)
  INTO v_threshold, v_total_games
  FROM game_goals;

  -- If we have very few games (new league), use default of 5
  IF v_total_games < 20 THEN
    RETURN 5;
  END IF;

  -- Ensure minimum threshold of 4 goals
  RETURN GREATEST(v_threshold, 4);
END;
$$;

COMMENT ON FUNCTION get_low_scoring_game_threshold IS
'Calculates the dynamic threshold for low_scoring_game insights.
Returns the 10th percentile (bottom 10%) of total goals scored,
so only the lowest-scoring 10% of games trigger insights.
Falls back to 5 if insufficient data (<20 games).
Minimum threshold of 4 to avoid trivial insights.';

GRANT EXECUTE ON FUNCTION get_low_scoring_game_threshold() TO authenticated;

-- =====================================================
-- THRESHOLD FUNCTION 2: get_team_best_score_threshold(team)
-- Calculates the 95th percentile of team scores for current year
-- =====================================================
CREATE OR REPLACE FUNCTION get_team_best_score_threshold(p_team TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_games_this_year INTEGER;
  v_current_year INTEGER;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

  -- Calculate 95th percentile of team scores for current year
  WITH team_scores AS (
    SELECT
      CASE WHEN p_team = 'blue' THEN score_blue ELSE score_orange END as score
    FROM games
    WHERE completed = true
      AND EXTRACT(YEAR FROM date) = v_current_year
      AND score_blue IS NOT NULL
      AND score_orange IS NOT NULL
  )
  SELECT
    COALESCE(
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY score)::INTEGER,
      9  -- Fallback default
    ),
    COUNT(*)
  INTO v_threshold, v_games_this_year
  FROM team_scores;

  -- If we have very few games this year, use fallback of 9
  IF v_games_this_year < 10 THEN
    RETURN 9;
  END IF;

  -- Ensure minimum threshold of 7 goals
  RETURN GREATEST(v_threshold, 7);
END;
$$;

COMMENT ON FUNCTION get_team_best_score_threshold IS
'Calculates the dynamic threshold for team_best_score insights.
Returns the 95th percentile of team scores for the current calendar year,
so only the top 5% of team performances trigger insights.
Falls back to 9 if insufficient data (<10 games this year).
Minimum threshold of 7 to avoid trivial insights.';

GRANT EXECUTE ON FUNCTION get_team_best_score_threshold(TEXT) TO authenticated;

-- =====================================================
-- THRESHOLD FUNCTION 3: get_team_dominance_threshold()
-- Calculates the 80th percentile of max wins in 7-game windows
-- =====================================================
CREATE OR REPLACE FUNCTION get_team_dominance_threshold()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_total_windows INTEGER;
BEGIN
  -- Calculate 80th percentile of max team wins in 7-game windows
  WITH game_outcomes AS (
    SELECT
      id,
      date,
      outcome,
      ROW_NUMBER() OVER (ORDER BY date) as game_num
    FROM games
    WHERE completed = true
      AND outcome IN ('blue_win', 'orange_win')
    ORDER BY date
  ),
  windows AS (
    -- For each game, count blue and orange wins in the 7-game window ending at that game
    SELECT
      g.game_num,
      (
        SELECT COUNT(*)
        FROM game_outcomes g2
        WHERE g2.game_num <= g.game_num
          AND g2.game_num > g.game_num - 7
          AND g2.outcome = 'blue_win'
      ) as blue_wins,
      (
        SELECT COUNT(*)
        FROM game_outcomes g2
        WHERE g2.game_num <= g.game_num
          AND g2.game_num > g.game_num - 7
          AND g2.outcome = 'orange_win'
      ) as orange_wins
    FROM game_outcomes g
    WHERE g.game_num >= 7  -- Only consider full 7-game windows
  ),
  max_wins AS (
    SELECT GREATEST(blue_wins, orange_wins) as dominant_wins
    FROM windows
  )
  SELECT
    COALESCE(
      PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY dominant_wins)::INTEGER,
      5  -- Fallback default
    ),
    COUNT(*)
  INTO v_threshold, v_total_windows
  FROM max_wins;

  -- If we have very few windows, use default of 5
  IF v_total_windows < 20 THEN
    RETURN 5;
  END IF;

  -- Ensure minimum threshold of 5 out of 7 games
  RETURN GREATEST(v_threshold, 5);
END;
$$;

COMMENT ON FUNCTION get_team_dominance_threshold IS
'Calculates the dynamic threshold for team_color_dominance insights.
Returns the 80th percentile of max team wins in 7-game rolling windows,
so only the top 20% of dominant periods trigger insights.
Falls back to 5 if insufficient data (<20 windows).
Minimum threshold of 5 (out of 7) to be considered dominant.';

GRANT EXECUTE ON FUNCTION get_team_dominance_threshold() TO authenticated;

-- =====================================================
-- THRESHOLD FUNCTION 4: get_team_streak_broken_threshold()
-- Calculates the 80th percentile of team winning streaks
-- =====================================================
CREATE OR REPLACE FUNCTION get_team_streak_broken_threshold()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_total_streaks INTEGER;
BEGIN
  -- Calculate 80th percentile of team winning streaks
  WITH game_outcomes AS (
    SELECT
      id,
      date,
      outcome,
      ROW_NUMBER() OVER (ORDER BY date) as game_num
    FROM games
    WHERE completed = true
      AND outcome IN ('blue_win', 'orange_win')
    ORDER BY date
  ),
  streak_groups AS (
    SELECT
      game_num,
      outcome,
      CASE
        WHEN outcome != LAG(outcome) OVER (ORDER BY date)
        THEN 1
        ELSE 0
      END as new_streak
    FROM game_outcomes
  ),
  streaks_numbered AS (
    SELECT
      game_num,
      outcome,
      SUM(new_streak) OVER (ORDER BY game_num) as streak_id
    FROM streak_groups
  ),
  streak_lengths AS (
    SELECT
      streak_id,
      outcome,
      COUNT(*) as streak_length
    FROM streaks_numbered
    GROUP BY streak_id, outcome
  )
  SELECT
    COALESCE(
      PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY streak_length)::INTEGER,
      4  -- Fallback default
    ),
    COUNT(*)
  INTO v_threshold, v_total_streaks
  FROM streak_lengths
  WHERE streak_length >= 2;  -- Only count meaningful streaks (2+ games)

  -- If we have very few streaks, use default of 4
  IF v_total_streaks < 20 THEN
    RETURN 4;
  END IF;

  -- Ensure minimum threshold of 3 games
  RETURN GREATEST(v_threshold, 3);
END;
$$;

COMMENT ON FUNCTION get_team_streak_broken_threshold IS
'Calculates the dynamic threshold for team_color_streak_broken insights.
Returns the 80th percentile of team winning streak lengths,
so only breaking the top 20% of streaks triggers insights.
Falls back to 4 if insufficient data (<20 streaks).
Minimum threshold of 3 to avoid trivial insights.';

GRANT EXECUTE ON FUNCTION get_team_streak_broken_threshold() TO authenticated;

-- =====================================================
-- THRESHOLD FUNCTION 5: get_player_color_curse_threshold()
-- Calculates the 95th percentile of win rate differences by team
-- =====================================================
CREATE OR REPLACE FUNCTION get_player_color_curse_threshold()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_total_players INTEGER;
BEGIN
  -- Calculate 95th percentile of win rate differences by team color
  -- Only include players with 20+ games on EACH team
  WITH player_team_stats AS (
    SELECT
      gr.player_id,
      gr.team,
      COUNT(*) as games,
      COUNT(*) FILTER (WHERE g.outcome = gr.team || '_win') as wins
    FROM game_registrations gr
    JOIN games g ON g.id = gr.game_id
    WHERE gr.status = 'selected'
      AND g.completed = true
      AND gr.team IS NOT NULL
    GROUP BY gr.player_id, gr.team
  ),
  player_both_teams AS (
    SELECT
      blue.player_id,
      blue.wins::NUMERIC / blue.games * 100 as blue_win_rate,
      orange.wins::NUMERIC / orange.games * 100 as orange_win_rate,
      ABS(blue.wins::NUMERIC / blue.games * 100 - orange.wins::NUMERIC / orange.games * 100) as win_rate_diff
    FROM player_team_stats blue
    JOIN player_team_stats orange ON blue.player_id = orange.player_id
    WHERE blue.team = 'blue'
      AND orange.team = 'orange'
      AND blue.games >= 20
      AND orange.games >= 20
  )
  SELECT
    COALESCE(
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY win_rate_diff)::INTEGER,
      25  -- Fallback default
    ),
    COUNT(*)
  INTO v_threshold, v_total_players
  FROM player_both_teams;

  -- If we have very few qualifying players, use default of 25
  IF v_total_players < 5 THEN
    RETURN 25;
  END IF;

  -- Ensure minimum threshold of 20 percentage points
  RETURN GREATEST(v_threshold, 20);
END;
$$;

COMMENT ON FUNCTION get_player_color_curse_threshold IS
'Calculates the dynamic threshold for player_color_curse insights.
Returns the 95th percentile of win rate differences between teams,
so only the top 5% of color-dependent players trigger insights.
Requires 20+ games on EACH team to be considered.
Falls back to 25 if insufficient data (<5 qualifying players).
Minimum threshold of 20 percentage points.';

GRANT EXECUTE ON FUNCTION get_player_color_curse_threshold() TO authenticated;

-- =====================================================
-- UPDATE: _generate_game_record_insights()
-- Adds: low_scoring_game, team_best_score, team_color_streak_broken
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_game_record_insights(
  p_game_id UUID,
  p_game RECORD,
  p_winning_players UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_streak INTEGER;
  v_low_scoring_threshold INTEGER;
  v_total_goals INTEGER;
  v_best_score_threshold_blue INTEGER;
  v_best_score_threshold_orange INTEGER;
  v_streak_broken_threshold INTEGER;
  v_previous_team_streak INTEGER;
  v_winning_team TEXT;
  v_losing_team TEXT;
BEGIN
  -- Get dynamic thresholds
  v_low_scoring_threshold := get_low_scoring_game_threshold();
  v_best_score_threshold_blue := get_team_best_score_threshold('blue');
  v_best_score_threshold_orange := get_team_best_score_threshold('orange');
  v_streak_broken_threshold := get_team_streak_broken_threshold();

  -- Calculate total goals
  v_total_goals := COALESCE(p_game.score_blue, 0) + COALESCE(p_game.score_orange, 0);

  -- BLOWOUT GAME
  IF ABS(COALESCE(p_game.score_blue, 0) - COALESCE(p_game.score_orange, 0)) >= 5 THEN
    DECLARE
      v_winning_team TEXT;
      v_winning_score INTEGER;
      v_losing_score INTEGER;
    BEGIN
      IF p_game.score_blue > p_game.score_orange THEN
        v_winning_team := 'Blue';
        v_winning_score := p_game.score_blue;
        v_losing_score := p_game.score_orange;
      ELSE
        v_winning_team := 'Orange';
        v_winning_score := p_game.score_orange;
        v_losing_score := p_game.score_blue;
      END IF;

      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'blowout_game', 3,
        format('Dominant display! %s demolishes opposition %s-%s', v_winning_team, v_winning_score, v_losing_score),
        jsonb_build_object('winning_team', v_winning_team, 'margin', v_winning_score - v_losing_score,
          'score_blue', p_game.score_blue, 'score_orange', p_game.score_orange),
        COALESCE(p_winning_players, '{}'::UUID[])
      );
    END;
  END IF;

  -- SHUTOUT GAME
  IF (p_game.score_blue = 0 OR p_game.score_orange = 0) AND p_game.outcome != 'draw' THEN
    DECLARE
      v_winning_team TEXT;
      v_winning_score INTEGER;
    BEGIN
      IF p_game.score_orange = 0 THEN
        v_winning_team := 'Blue';
        v_winning_score := p_game.score_blue;
      ELSE
        v_winning_team := 'Orange';
        v_winning_score := p_game.score_orange;
      END IF;

      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'shutout_game', 3,
        format('Clean sheet! %s keeps opposition scoreless (%s-0)', v_winning_team, v_winning_score),
        jsonb_build_object('winning_team', v_winning_team, 'score', v_winning_score,
          'score_blue', p_game.score_blue, 'score_orange', p_game.score_orange),
        COALESCE(p_winning_players, '{}'::UUID[])
      );
    END;
  END IF;

  -- TEAM COLOR STREAKS (existing team_streak insight)
  IF p_game.outcome IN ('blue_win', 'orange_win') THEN
    SELECT COUNT(*) INTO v_team_streak
    FROM (
      SELECT g.id, g.outcome
      FROM games g
      WHERE g.completed = true AND g.date <= p_game.date
      ORDER BY g.date DESC
      LIMIT 10
    ) recent
    WHERE recent.outcome = p_game.outcome;

    IF v_team_streak >= 3 THEN
      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'team_streak', 5,
        format('%s won %s in a row!',
          CASE WHEN p_game.outcome = 'blue_win' THEN 'Blue' ELSE 'Orange' END,
          v_team_streak),
        jsonb_build_object('team', p_game.outcome, 'streak', v_team_streak),
        '{}'::UUID[]
      );
    END IF;
  END IF;

  -- TEAM COLOR STREAK BROKEN (new insight)
  -- Check if the losing team had a significant winning streak that was just broken
  IF p_game.outcome IN ('blue_win', 'orange_win') THEN
    v_losing_team := CASE WHEN p_game.outcome = 'blue_win' THEN 'orange' ELSE 'blue' END;
    v_winning_team := CASE WHEN p_game.outcome = 'blue_win' THEN 'Blue' ELSE 'Orange' END;

    -- Count the losing team's consecutive wins BEFORE this game
    SELECT COUNT(*) INTO v_previous_team_streak
    FROM (
      SELECT g.id, g.outcome
      FROM games g
      WHERE g.completed = true
        AND g.date < p_game.date
      ORDER BY g.date DESC
      LIMIT 20  -- Upper bound for streak check
    ) recent
    WHERE recent.outcome = v_losing_team || '_win'
    -- Count consecutive wins from the most recent game backwards
    AND NOT EXISTS (
      SELECT 1 FROM (
        SELECT g2.id, g2.outcome, ROW_NUMBER() OVER (ORDER BY g2.date DESC) as rn
        FROM games g2
        WHERE g2.completed = true AND g2.date < p_game.date
      ) earlier
      WHERE earlier.outcome != v_losing_team || '_win'
        AND earlier.rn < (
          SELECT MIN(r.rn) FROM (
            SELECT g3.id, ROW_NUMBER() OVER (ORDER BY g3.date DESC) as rn
            FROM games g3
            WHERE g3.completed = true AND g3.date < p_game.date AND g3.id = recent.id
          ) r
        )
    );

    -- Recalculate properly: count consecutive wins for losing team before this game
    WITH recent_games AS (
      SELECT
        g.id,
        g.outcome,
        ROW_NUMBER() OVER (ORDER BY g.date DESC) as rn
      FROM games g
      WHERE g.completed = true
        AND g.date < p_game.date
    ),
    streak_check AS (
      SELECT
        rn,
        outcome,
        CASE WHEN outcome = v_losing_team || '_win' THEN 1 ELSE 0 END as is_win
      FROM recent_games
      ORDER BY rn
    )
    SELECT COUNT(*) INTO v_previous_team_streak
    FROM streak_check
    WHERE rn <= (
      -- Find the first non-win (where streak breaks)
      SELECT COALESCE(MIN(rn) - 1, (SELECT COUNT(*) FROM streak_check))
      FROM streak_check
      WHERE is_win = 0
    )
    AND is_win = 1;

    IF v_previous_team_streak >= v_streak_broken_threshold THEN
      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'team_color_streak_broken', 3,
        format('%s ends %s''s %s-game winning streak!',
          v_winning_team,
          INITCAP(v_losing_team),
          v_previous_team_streak),
        jsonb_build_object(
          'winning_team', LOWER(v_winning_team),
          'losing_team', v_losing_team,
          'streak_broken', v_previous_team_streak,
          'threshold_used', v_streak_broken_threshold
        ),
        COALESCE(p_winning_players, '{}'::UUID[])
      );
    END IF;
  END IF;

  -- GOAL FEST (high scoring)
  IF v_total_goals >= 10 THEN
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (
      p_game_id, 'game_record', 5,
      format('Goal fest! WNF #%s finished %s-%s', p_game.sequence_number, p_game.score_blue, p_game.score_orange),
      jsonb_build_object('total_goals', v_total_goals),
      '{}'::UUID[]
    );
  END IF;

  -- LOW SCORING GAME (new insight - 10th percentile)
  IF v_total_goals <= v_low_scoring_threshold AND v_total_goals > 0 THEN
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (
      p_game_id, 'low_scoring_game', 4,
      format('Defensive battle! Only %s goals scored in WNF #%s', v_total_goals, p_game.sequence_number),
      jsonb_build_object(
        'total_goals', v_total_goals,
        'threshold_used', v_low_scoring_threshold,
        'score_blue', p_game.score_blue,
        'score_orange', p_game.score_orange
      ),
      '{}'::UUID[]
    );
  END IF;

  -- TEAM BEST SCORE (new insight - 95th percentile for current year)
  -- Check Blue team best score
  IF p_game.score_blue >= v_best_score_threshold_blue THEN
    DECLARE
      v_is_best_this_year BOOLEAN;
      v_current_year INTEGER;
    BEGIN
      v_current_year := EXTRACT(YEAR FROM p_game.date)::INTEGER;

      -- Check if this is actually the best Blue score this year
      SELECT NOT EXISTS (
        SELECT 1 FROM games g
        WHERE g.completed = true
          AND g.id != p_game_id
          AND EXTRACT(YEAR FROM g.date) = v_current_year
          AND g.score_blue >= p_game.score_blue
      ) INTO v_is_best_this_year;

      IF v_is_best_this_year THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'team_best_score', 3,
          format('Blue''s best! %s goals - highest Blue score in %s', p_game.score_blue, v_current_year),
          jsonb_build_object(
            'team', 'blue',
            'score', p_game.score_blue,
            'year', v_current_year,
            'threshold_used', v_best_score_threshold_blue
          ),
          '{}'::UUID[]
        );
      END IF;
    END;
  END IF;

  -- Check Orange team best score
  IF p_game.score_orange >= v_best_score_threshold_orange THEN
    DECLARE
      v_is_best_this_year BOOLEAN;
      v_current_year INTEGER;
    BEGIN
      v_current_year := EXTRACT(YEAR FROM p_game.date)::INTEGER;

      -- Check if this is actually the best Orange score this year
      SELECT NOT EXISTS (
        SELECT 1 FROM games g
        WHERE g.completed = true
          AND g.id != p_game_id
          AND EXTRACT(YEAR FROM g.date) = v_current_year
          AND g.score_orange >= p_game.score_orange
      ) INTO v_is_best_this_year;

      IF v_is_best_this_year THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'team_best_score', 3,
          format('Orange''s best! %s goals - highest Orange score in %s', p_game.score_orange, v_current_year),
          jsonb_build_object(
            'team', 'orange',
            'score', p_game.score_orange,
            'year', v_current_year,
            'threshold_used', v_best_score_threshold_orange
          ),
          '{}'::UUID[]
        );
      END IF;
    END;
  END IF;

  -- CLOSE GAME
  IF ABS(COALESCE(p_game.score_blue, 0) - COALESCE(p_game.score_orange, 0)) <= 1 THEN
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (
      p_game_id, 'game_record', 5,
      CASE WHEN p_game.score_blue = p_game.score_orange
        THEN format('Honours even! WNF #%s ended %s-%s', p_game.sequence_number, p_game.score_blue, p_game.score_orange)
        ELSE format('Nail-biter! WNF #%s decided by a single goal (%s-%s)', p_game.sequence_number, p_game.score_blue, p_game.score_orange)
      END,
      jsonb_build_object('margin', ABS(p_game.score_blue - p_game.score_orange)),
      '{}'::UUID[]
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION _generate_game_record_insights IS
'Helper: generates game-level insights (blowout, shutout, records, streaks).
Updated Jan 2026 to include:
- low_scoring_game: triggers when total goals <= 10th percentile (defensive battles)
- team_best_score: triggers when team scores in top 5% for current year
- team_color_streak_broken: triggers when a significant team streak ends';

-- =====================================================
-- UPDATE: _generate_team_color_insights()
-- Adds: team_color_dominance, player_color_curse
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
  v_dominance_threshold INTEGER;
  v_color_curse_threshold INTEGER;
  v_blue_wins_7 INTEGER;
  v_orange_wins_7 INTEGER;
BEGIN
  -- Get dynamic thresholds (cached for this execution)
  v_color_streak_threshold := get_color_streak_threshold();
  v_dominance_threshold := get_team_dominance_threshold();
  v_color_curse_threshold := get_player_color_curse_threshold();

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

  -- TEAM COLOR SWITCH (uses dynamic threshold)
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

  -- TEAM COLOR DOMINANCE (new insight)
  -- Check if one team has won X of the last 7 games (including this one)
  IF p_game.outcome IN ('blue_win', 'orange_win') THEN
    WITH recent_7 AS (
      SELECT outcome
      FROM games
      WHERE completed = true
        AND date <= p_game.date
        AND outcome IN ('blue_win', 'orange_win')
      ORDER BY date DESC
      LIMIT 7
    )
    SELECT
      COUNT(*) FILTER (WHERE outcome = 'blue_win'),
      COUNT(*) FILTER (WHERE outcome = 'orange_win')
    INTO v_blue_wins_7, v_orange_wins_7
    FROM recent_7;

    -- Only show if the winning team is dominant AND this game contributed to it
    IF v_blue_wins_7 >= v_dominance_threshold AND p_game.outcome = 'blue_win' THEN
      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'team_color_dominance', 3,
        format('Blue dominance! Won %s of the last 7 games', v_blue_wins_7),
        jsonb_build_object(
          'dominant_team', 'blue',
          'wins', v_blue_wins_7,
          'out_of', 7,
          'threshold_used', v_dominance_threshold
        ),
        '{}'::UUID[]
      );
    ELSIF v_orange_wins_7 >= v_dominance_threshold AND p_game.outcome = 'orange_win' THEN
      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'team_color_dominance', 3,
        format('Orange dominance! Won %s of the last 7 games', v_orange_wins_7),
        jsonb_build_object(
          'dominant_team', 'orange',
          'wins', v_orange_wins_7,
          'out_of', 7,
          'threshold_used', v_dominance_threshold
        ),
        '{}'::UUID[]
      );
    END IF;
  END IF;

  -- PLAYER COLOR CURSE (new insight)
  -- Check for players with significant win rate difference by team color
  -- Only trigger if: player is on their "bad" team AND they lost this game
  IF p_game.outcome IN ('blue_win', 'orange_win') THEN
    DECLARE
      v_losing_team TEXT;
      v_curse_count INTEGER := 0;
    BEGIN
      v_losing_team := CASE WHEN p_game.outcome = 'blue_win' THEN 'orange' ELSE 'blue' END;

      FOR v_player IN
        WITH player_team_stats AS (
          SELECT
            gr.player_id,
            gr.team,
            COUNT(*) as games,
            COUNT(*) FILTER (WHERE g.outcome = gr.team || '_win') as wins
          FROM game_registrations gr
          JOIN games g ON g.id = gr.game_id
          WHERE gr.status = 'selected'
            AND g.completed = true
            AND gr.team IS NOT NULL
            AND gr.player_id = ANY(p_all_players)
          GROUP BY gr.player_id, gr.team
        ),
        player_curse AS (
          SELECT
            p.id,
            p.friendly_name,
            blue.games as blue_games,
            orange.games as orange_games,
            ROUND(blue.wins::NUMERIC / blue.games * 100, 0) as blue_win_rate,
            ROUND(orange.wins::NUMERIC / orange.games * 100, 0) as orange_win_rate,
            ROUND(blue.wins::NUMERIC / blue.games * 100 - orange.wins::NUMERIC / orange.games * 100, 0) as diff,
            CASE
              WHEN blue.wins::NUMERIC / blue.games > orange.wins::NUMERIC / orange.games THEN 'orange'
              ELSE 'blue'
            END as cursed_team
          FROM player_team_stats blue
          JOIN player_team_stats orange ON blue.player_id = orange.player_id
          JOIN players p ON p.id = blue.player_id
          WHERE blue.team = 'blue'
            AND orange.team = 'orange'
            AND blue.games >= 20
            AND orange.games >= 20
        )
        SELECT
          pc.id,
          pc.friendly_name,
          pc.blue_win_rate,
          pc.orange_win_rate,
          pc.cursed_team,
          ABS(pc.diff) as diff
        FROM player_curse pc
        JOIN game_registrations gr ON gr.player_id = pc.id
        WHERE gr.game_id = p_game_id
          AND gr.status = 'selected'
          AND gr.team = v_losing_team  -- Player is on losing team
          AND pc.cursed_team = v_losing_team  -- Player is on their "bad" team
          AND ABS(pc.diff) >= v_color_curse_threshold
        ORDER BY ABS(pc.diff) DESC
        LIMIT 2  -- Max 2 per game
      LOOP
        v_curse_count := v_curse_count + 1;

        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'player_color_curse', 4,
          format('Color curse! %s wins %s%% on %s, only %s%% on %s',
            v_player.friendly_name,
            CASE WHEN v_player.cursed_team = 'orange' THEN v_player.blue_win_rate ELSE v_player.orange_win_rate END,
            CASE WHEN v_player.cursed_team = 'orange' THEN 'Blue' ELSE 'Orange' END,
            CASE WHEN v_player.cursed_team = 'orange' THEN v_player.orange_win_rate ELSE v_player.blue_win_rate END,
            INITCAP(v_player.cursed_team)),
          jsonb_build_object(
            'player_id', v_player.id,
            'player_name', v_player.friendly_name,
            'blue_win_rate', v_player.blue_win_rate,
            'orange_win_rate', v_player.orange_win_rate,
            'cursed_team', v_player.cursed_team,
            'difference', v_player.diff,
            'threshold_used', v_color_curse_threshold
          ),
          ARRAY[v_player.id]
        );
      END LOOP;
    END;
  END IF;
END;
$$;

COMMENT ON FUNCTION _generate_team_color_insights IS
'Helper: generates team color loyalty, switch, dominance, and curse insights.
Updated Jan 2026 to include:
- team_color_dominance: triggers when one team wins X of last 7 games (80th percentile)
- player_color_curse: triggers when player has 95th percentile win rate difference by team
  Only shows when player is on their "bad" team AND they lost';

-- =====================================================
-- DIAGNOSTIC QUERIES
-- =====================================================
-- Run these queries to verify threshold values:
--
-- SELECT get_low_scoring_game_threshold();
-- SELECT get_team_best_score_threshold('blue');
-- SELECT get_team_best_score_threshold('orange');
-- SELECT get_team_dominance_threshold();
-- SELECT get_team_streak_broken_threshold();
-- SELECT get_player_color_curse_threshold();
--
-- Regenerate insights for a specific game:
-- SELECT * FROM generate_game_insights_on_demand('<game_id>')
-- WHERE analysis_type IN (
--   'low_scoring_game', 'team_best_score', 'team_color_dominance',
--   'team_color_streak_broken', 'player_color_curse'
-- );
-- =====================================================

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- 1. Created 5 threshold functions:
--    - get_low_scoring_game_threshold() - 10th percentile of total goals
--    - get_team_best_score_threshold(team) - 95th percentile of team scores
--    - get_team_dominance_threshold() - 80th percentile of 7-game dominance
--    - get_team_streak_broken_threshold() - 80th percentile of team streaks
--    - get_player_color_curse_threshold() - 95th percentile of win rate diffs
--
-- 2. Updated _generate_game_record_insights() with:
--    - low_scoring_game (priority 4)
--    - team_best_score (priority 3)
--    - team_color_streak_broken (priority 3)
--
-- 3. Updated _generate_team_color_insights() with:
--    - team_color_dominance (priority 3)
--    - player_color_curse (priority 4, max 2 per game)
-- =====================================================
