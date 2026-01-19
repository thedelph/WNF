-- =====================================================
-- Injury Insights + Insights System Modularization
-- =====================================================
-- This migration:
-- 1. Adds injury_token_used and injury_token_return insight types
-- 2. Modularizes the generate_game_insights_on_demand function
--    into smaller, focused helper functions
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: _generate_appearance_insights
-- Handles: debut_appearance, return_after_absence, first_game_back_win, bench_warmer_promoted
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_appearance_insights(
  p_game_id UUID,
  p_game RECORD,
  p_all_players UUID[],
  p_winning_players UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_player RECORD;
BEGIN
  -- DEBUT APPEARANCE
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(p_all_players)
  LOOP
    DECLARE
      v_first_game_seq INTEGER;
    BEGIN
      SELECT MIN(g.sequence_number) INTO v_first_game_seq
      FROM game_registrations gr
      JOIN games g ON gr.game_id = g.id
      WHERE gr.player_id = v_player.id
        AND gr.status = 'selected'
        AND g.completed = true;

      IF v_first_game_seq = p_game.sequence_number THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'debut_appearance', 3,
          format('Welcome to WNF! %s makes their debut', v_player.friendly_name),
          jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name, 'game_number', p_game.sequence_number),
          ARRAY[v_player.id]
        );
      END IF;
    END;
  END LOOP;

  -- RETURN AFTER ABSENCE
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(p_all_players)
  LOOP
    DECLARE
      v_prev_game_seq INTEGER;
      v_games_missed INTEGER;
    BEGIN
      SELECT MAX(g.sequence_number) INTO v_prev_game_seq
      FROM game_registrations gr
      JOIN games g ON gr.game_id = g.id
      WHERE gr.player_id = v_player.id
        AND gr.status = 'selected'
        AND g.completed = true
        AND g.sequence_number < p_game.sequence_number;

      IF v_prev_game_seq IS NOT NULL THEN
        v_games_missed := p_game.sequence_number - v_prev_game_seq - 1;

        IF v_games_missed >= 5 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'return_after_absence',
            CASE WHEN v_games_missed >= 20 THEN 2 WHEN v_games_missed >= 10 THEN 3 ELSE 4 END,
            format('Welcome back! %s returns after %s-game absence', v_player.friendly_name, v_games_missed),
            jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name, 'games_missed', v_games_missed),
            ARRAY[v_player.id]
          );
        END IF;
      END IF;
    END;
  END LOOP;

  -- FIRST GAME BACK WIN
  IF p_winning_players IS NOT NULL THEN
    FOR v_player IN
      SELECT p.id, p.friendly_name
      FROM players p
      WHERE p.id = ANY(p_winning_players)
    LOOP
      DECLARE
        v_prev_game_seq INTEGER;
        v_games_missed INTEGER;
      BEGIN
        SELECT MAX(g.sequence_number) INTO v_prev_game_seq
        FROM game_registrations gr
        JOIN games g ON gr.game_id = g.id
        WHERE gr.player_id = v_player.id
          AND gr.status = 'selected'
          AND g.completed = true
          AND g.sequence_number < p_game.sequence_number;

        IF v_prev_game_seq IS NOT NULL THEN
          v_games_missed := p_game.sequence_number - v_prev_game_seq - 1;

          IF v_games_missed >= 5 THEN
            INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
            VALUES (
              p_game_id, 'first_game_back_win', 2,
              format('Triumphant return! %s wins on comeback after %s-game break', v_player.friendly_name, v_games_missed),
              jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name, 'games_missed', v_games_missed),
              ARRAY[v_player.id]
            );
          END IF;
        END IF;
      END;
    END LOOP;
  END IF;

  -- BENCH WARMER PROMOTED
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(p_all_players)
  LOOP
    DECLARE
      v_reserve_streak INTEGER := 0;
    BEGIN
      SELECT COUNT(*) INTO v_reserve_streak
      FROM (
        SELECT gr.status, g.sequence_number
        FROM game_registrations gr
        JOIN games g ON gr.game_id = g.id
        WHERE gr.player_id = v_player.id
          AND g.sequence_number < p_game.sequence_number
          AND g.completed = true
        ORDER BY g.sequence_number DESC
        LIMIT 10
      ) recent
      WHERE recent.status = 'reserve'
      AND NOT EXISTS (
        SELECT 1 FROM game_registrations gr2
        JOIN games g2 ON gr2.game_id = g2.id
        WHERE gr2.player_id = v_player.id
          AND gr2.status = 'selected'
          AND g2.sequence_number < p_game.sequence_number
          AND g2.sequence_number > recent.sequence_number
      );

      IF v_reserve_streak >= 3 THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'bench_warmer_promoted', 4,
          format('Finally on the pitch! %s plays after %s reserve appearances', v_player.friendly_name, v_reserve_streak),
          jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name, 'reserve_streak', v_reserve_streak),
          ARRAY[v_player.id]
        );
      END IF;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION _generate_appearance_insights IS 'Helper: generates debut, return, comeback win, and bench warmer insights';

-- =====================================================
-- HELPER FUNCTION: _generate_injury_insights
-- Handles: injury_token_used, injury_token_return
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_injury_insights(
  p_game_id UUID,
  p_game RECORD
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_injury RECORD;
  v_hours_since NUMERIC;
BEGIN
  -- INJURY ABSENCE: Players missing this game due to injury
  FOR v_injury IN
    SELECT
      itu.player_id,
      itu.original_streak,
      itu.return_streak,
      itu.activated_at,
      p.friendly_name
    FROM injury_token_usage itu
    JOIN players p ON p.id = itu.player_id
    WHERE itu.injury_game_id = p_game_id
      AND itu.status = 'active'
  LOOP
    -- Calculate hours since activation
    v_hours_since := EXTRACT(EPOCH FROM (p_game.date - v_injury.activated_at)) / 3600;

    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (
      p_game_id,
      'injury_token_used',
      -- Priority 1 if activated recently (<48hrs), otherwise priority 2
      CASE WHEN v_hours_since < 48 THEN 1 ELSE 2 END,
      format('🏥 Sidelined: %s out with injury (protecting %s-game streak)',
        v_injury.friendly_name, v_injury.original_streak),
      jsonb_build_object(
        'player_id', v_injury.player_id,
        'player_name', v_injury.friendly_name,
        'original_streak', v_injury.original_streak,
        'return_streak', v_injury.return_streak,
        'hours_since_activation', ROUND(v_hours_since)
      ),
      ARRAY[v_injury.player_id]
    );
  END LOOP;

  -- INJURY RETURN: Players returning from injury this game
  FOR v_injury IN
    SELECT
      itu.player_id,
      itu.original_streak,
      itu.return_streak,
      itu.activated_at,
      itu.returned_at,
      p.friendly_name,
      -- Count games missed while injured
      (
        SELECT COUNT(*)
        FROM games g
        WHERE g.completed = true
          AND g.date > itu.activated_at
          AND g.date <= p_game.date
      ) as games_missed
    FROM injury_token_usage itu
    JOIN players p ON p.id = itu.player_id
    WHERE itu.return_game_id = p_game_id
      AND itu.status = 'returned'
  LOOP
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (
      p_game_id,
      'injury_token_return',
      -- Priority 2 for large streaks (20+), otherwise priority 3
      CASE WHEN v_injury.return_streak >= 20 THEN 2 ELSE 3 END,
      format('💉 Back in action! %s returns from injury (streak: %s)',
        v_injury.friendly_name, v_injury.return_streak),
      jsonb_build_object(
        'player_id', v_injury.player_id,
        'player_name', v_injury.friendly_name,
        'original_streak', v_injury.original_streak,
        'return_streak', v_injury.return_streak,
        'games_missed', v_injury.games_missed
      ),
      ARRAY[v_injury.player_id]
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION _generate_injury_insights IS 'Helper: generates injury absence and injury return insights';

-- =====================================================
-- HELPER FUNCTION: _generate_streak_insights
-- Handles: attendance_streak, win_streak, losing_streak, etc.
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_streak_insights(
  p_game_id UUID,
  p_game RECORD,
  p_all_players UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_player RECORD;
  v_streaks_before RECORD;
BEGIN
  -- ATTENDANCE STREAK
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(p_all_players)
  LOOP
    DECLARE
      v_current_streak INTEGER := 0;
      v_check_seq INTEGER;
    BEGIN
      v_check_seq := p_game.sequence_number;

      LOOP
        IF EXISTS (
          SELECT 1 FROM game_registrations gr
          JOIN games g ON gr.game_id = g.id
          WHERE gr.player_id = v_player.id
            AND gr.status = 'selected'
            AND g.sequence_number = v_check_seq
            AND g.completed = true
        ) THEN
          v_current_streak := v_current_streak + 1;
          v_check_seq := v_check_seq - 1;
        ELSE
          EXIT;
        END IF;

        IF v_current_streak > 100 THEN EXIT; END IF;
      END LOOP;

      IF v_current_streak IN (10, 20, 30, 40, 50) THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'attendance_streak',
          CASE WHEN v_current_streak >= 30 THEN 2 WHEN v_current_streak >= 20 THEN 3 ELSE 4 END,
          format('Iron man! %s reaches %s consecutive games', v_player.friendly_name, v_current_streak),
          jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name, 'streak', v_current_streak),
          ARRAY[v_player.id]
        );
      END IF;
    END;
  END LOOP;

  -- WIN/LOSS/UNBEATEN STREAKS
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(p_all_players)
  LOOP
    SELECT * INTO v_streaks_before
    FROM calculate_player_streaks_before_game(v_player.id, p_game.date);

    DECLARE
      v_this_result TEXT;
      v_player_team TEXT;
    BEGIN
      SELECT gr.team INTO v_player_team
      FROM game_registrations gr
      WHERE gr.game_id = p_game_id AND gr.player_id = v_player.id;

      IF (v_player_team = 'blue' AND p_game.outcome = 'blue_win') OR
         (v_player_team = 'orange' AND p_game.outcome = 'orange_win') THEN
        v_this_result := 'win';
      ELSIF p_game.outcome = 'draw' THEN
        v_this_result := 'draw';
      ELSE
        v_this_result := 'loss';
      END IF;

      -- Win streak insights
      IF v_this_result = 'win' THEN
        IF v_streaks_before.win_streak >= 2 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'win_streak', 2,
            format('On fire! %s wins %s in a row', v_player.friendly_name, v_streaks_before.win_streak + 1),
            jsonb_build_object('player', v_player.friendly_name, 'streak', v_streaks_before.win_streak + 1),
            ARRAY[v_player.id]
          );
        END IF;

        IF v_streaks_before.losing_streak >= 3 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'losing_streak_ended', 2,
            format('Finally! %s ends %s-game losing run', v_player.friendly_name, v_streaks_before.losing_streak),
            jsonb_build_object('player', v_player.friendly_name, 'ended_streak', v_streaks_before.losing_streak),
            ARRAY[v_player.id]
          );
        END IF;
      END IF;

      -- Loss insights
      IF v_this_result = 'loss' THEN
        IF v_streaks_before.win_streak >= 3 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'win_streak_ended', 3,
            format('Streak ended: %s''s %s-game win streak broken', v_player.friendly_name, v_streaks_before.win_streak),
            jsonb_build_object('player', v_player.friendly_name, 'ended_streak', v_streaks_before.win_streak),
            ARRAY[v_player.id]
          );
        END IF;

        IF v_streaks_before.losing_streak >= 3 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'losing_streak', 4,
            format('Struggling: %s hasn''t won in %s games', v_player.friendly_name, v_streaks_before.losing_streak + 1),
            jsonb_build_object('player', v_player.friendly_name, 'streak', v_streaks_before.losing_streak + 1),
            ARRAY[v_player.id]
          );
        END IF;
      END IF;

      -- Unbeaten streak
      IF v_this_result IN ('win', 'draw') AND v_streaks_before.unbeaten_streak >= 4 THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'unbeaten_streak', 3,
          format('Unbeaten in %s! %s extends run', v_streaks_before.unbeaten_streak + 1, v_player.friendly_name),
          jsonb_build_object('player', v_player.friendly_name, 'streak', v_streaks_before.unbeaten_streak + 1),
          ARRAY[v_player.id]
        );
      END IF;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION _generate_streak_insights IS 'Helper: generates attendance and win/loss streak insights';

-- =====================================================
-- HELPER FUNCTION: _generate_team_color_insights
-- Handles: team_color_loyalty, team_color_switch
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
BEGIN
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

  -- TEAM COLOR SWITCH
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
        LIMIT 10
      ) recent
      WHERE recent.team = v_other_team;

      IF v_other_team_streak >= 5 THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'team_color_switch', 5,
          format('Rare sight! %s plays %s for first time in %s games',
            v_player.friendly_name,
            CASE WHEN v_player.current_team = 'blue' THEN 'Blue' ELSE 'Orange' END,
            v_other_team_streak + 1),
          jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name,
            'new_team', v_player.current_team, 'streak_on_other', v_other_team_streak),
          ARRAY[v_player.id]
        );
      END IF;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION _generate_team_color_insights IS 'Helper: generates team color loyalty and switch insights';

-- =====================================================
-- HELPER FUNCTION: _generate_game_record_insights
-- Handles: blowout_game, shutout_game, game_record, team_streak
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
BEGIN
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

  -- TEAM COLOR STREAKS
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

  -- GOAL FEST
  IF COALESCE(p_game.score_blue, 0) + COALESCE(p_game.score_orange, 0) >= 10 THEN
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (
      p_game_id, 'game_record', 5,
      format('Goal fest! WNF #%s finished %s-%s', p_game.sequence_number, p_game.score_blue, p_game.score_orange),
      jsonb_build_object('total_goals', p_game.score_blue + p_game.score_orange),
      '{}'::UUID[]
    );
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

COMMENT ON FUNCTION _generate_game_record_insights IS 'Helper: generates game-level insights (blowout, shutout, records, streaks)';

-- =====================================================
-- HELPER FUNCTION: _generate_milestone_insights
-- Handles: cap_milestone, partnership_milestone, partnership_first
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_milestone_insights(
  p_game_id UUID,
  p_game RECORD,
  p_all_players UUID[],
  p_blue_players UUID[],
  p_orange_players UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_player RECORD;
  v_caps_before INTEGER;
  v_caps_after INTEGER;
  v_cap_milestone INTEGER;
  v_p1 UUID;
  v_p2 UUID;
  v_games_together_before INTEGER;
  v_games_together_after INTEGER;
BEGIN
  -- CAP MILESTONES
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(p_all_players)
  LOOP
    SELECT COUNT(*) INTO v_caps_before
    FROM game_registrations gr
    JOIN games g ON gr.game_id = g.id
    WHERE gr.player_id = v_player.id
      AND gr.status = 'selected'
      AND g.completed = true
      AND g.date < p_game.date;

    v_caps_after := v_caps_before + 1;

    FOR v_cap_milestone IN SELECT unnest(ARRAY[10, 25, 50, 75, 100, 150]) LOOP
      IF v_caps_after = v_cap_milestone THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'cap_milestone', 4,
          CASE v_cap_milestone
            WHEN 100 THEN format('Century club! %s played their 100th game', v_player.friendly_name)
            WHEN 50 THEN format('Half century: %s reached 50 caps', v_player.friendly_name)
            ELSE format('Milestone: %s reached %s caps', v_player.friendly_name, v_cap_milestone)
          END,
          jsonb_build_object('player', v_player.friendly_name, 'caps', v_caps_after),
          ARRAY[v_player.id]
        );
        EXIT;
      END IF;
    END LOOP;
  END LOOP;

  -- PARTNERSHIP MILESTONES (Blue team)
  IF p_blue_players IS NOT NULL AND array_length(p_blue_players, 1) >= 2 THEN
    FOR i IN 1..array_length(p_blue_players, 1)-1 LOOP
      FOR j IN i+1..array_length(p_blue_players, 1) LOOP
        v_p1 := p_blue_players[i];
        v_p2 := p_blue_players[j];

        SELECT COUNT(*) INTO v_games_together_before
        FROM game_registrations gr1
        JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
          AND gr1.status = 'selected' AND gr2.status = 'selected'
          AND g.completed = true AND g.date < p_game.date;

        v_games_together_after := v_games_together_before + 1;

        DECLARE
          v_p1_name TEXT;
          v_p2_name TEXT;
        BEGIN
          SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
          SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;

          IF v_games_together_after = 1 THEN
            INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
            VALUES (
              p_game_id, 'partnership_first', 3,
              format('First time: %s & %s played together', v_p1_name, v_p2_name),
              jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name]),
              ARRAY[v_p1, v_p2]
            );
          ELSE
            FOR v_cap_milestone IN SELECT unnest(ARRAY[10, 25, 50, 75, 100]) LOOP
              IF v_games_together_after = v_cap_milestone THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (
                  p_game_id, 'partnership_milestone', 3,
                  format('%s games together! %s & %s', v_cap_milestone, v_p1_name, v_p2_name),
                  jsonb_build_object('games_together', v_games_together_after),
                  ARRAY[v_p1, v_p2]
                );
                EXIT;
              END IF;
            END LOOP;
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- PARTNERSHIP MILESTONES (Orange team)
  IF p_orange_players IS NOT NULL AND array_length(p_orange_players, 1) >= 2 THEN
    FOR i IN 1..array_length(p_orange_players, 1)-1 LOOP
      FOR j IN i+1..array_length(p_orange_players, 1) LOOP
        v_p1 := p_orange_players[i];
        v_p2 := p_orange_players[j];

        SELECT COUNT(*) INTO v_games_together_before
        FROM game_registrations gr1
        JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
          AND gr1.status = 'selected' AND gr2.status = 'selected'
          AND g.completed = true AND g.date < p_game.date;

        v_games_together_after := v_games_together_before + 1;

        DECLARE
          v_p1_name TEXT;
          v_p2_name TEXT;
        BEGIN
          SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
          SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;

          IF v_games_together_after = 1 THEN
            INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
            VALUES (
              p_game_id, 'partnership_first', 3,
              format('First time: %s & %s played together', v_p1_name, v_p2_name),
              jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name]),
              ARRAY[v_p1, v_p2]
            );
          ELSE
            FOR v_cap_milestone IN SELECT unnest(ARRAY[10, 25, 50, 75, 100]) LOOP
              IF v_games_together_after = v_cap_milestone THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (
                  p_game_id, 'partnership_milestone', 3,
                  format('%s games together! %s & %s', v_cap_milestone, v_p1_name, v_p2_name),
                  jsonb_build_object('games_together', v_games_together_after),
                  ARRAY[v_p1, v_p2]
                );
                EXIT;
              END IF;
            END LOOP;
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION _generate_milestone_insights IS 'Helper: generates cap and partnership milestone insights';

-- =====================================================
-- HELPER FUNCTION: _generate_chemistry_insights
-- Handles: chemistry_kings, chemistry_curse, chemistry_milestone
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_chemistry_insights(
  p_game_id UUID,
  p_winning_players UUID[],
  p_losing_players UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_p1 UUID;
  v_p2 UUID;
  v_chemistry RECORD;
BEGIN
  -- Process winning team pairs (chemistry kings)
  IF p_winning_players IS NOT NULL AND array_length(p_winning_players, 1) >= 2 THEN
    FOR i IN 1..array_length(p_winning_players, 1)-1 LOOP
      FOR j IN i+1..array_length(p_winning_players, 1) LOOP
        v_p1 := p_winning_players[i];
        v_p2 := p_winning_players[j];

        SELECT * INTO v_chemistry
        FROM get_player_pair_chemistry(v_p1, v_p2);

        IF v_chemistry IS NOT NULL AND v_chemistry.games_together >= 10 THEN
          DECLARE
            v_p1_name TEXT;
            v_p2_name TEXT;
            v_win_rate NUMERIC;
          BEGIN
            SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
            SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
            v_win_rate := ROUND((v_chemistry.wins_together::NUMERIC / v_chemistry.games_together) * 100, 1);

            IF v_win_rate >= 60 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'chemistry_kings', 3,
                format('Chemistry kings: %s & %s win again (%s%% together)', v_p1_name, v_p2_name, v_win_rate),
                jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name], 'win_rate', v_win_rate, 'games', v_chemistry.games_together),
                ARRAY[v_p1, v_p2]
              );
            END IF;

            IF v_chemistry.wins_together IN (10, 20, 30, 40, 50) THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'chemistry_milestone', 3,
                format('%s wins together! %s & %s', v_chemistry.wins_together, v_p1_name, v_p2_name),
                jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name], 'wins', v_chemistry.wins_together),
                ARRAY[v_p1, v_p2]
              );
            END IF;
          END;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Process losing team pairs (chemistry curse)
  IF p_losing_players IS NOT NULL AND array_length(p_losing_players, 1) >= 2 THEN
    FOR i IN 1..array_length(p_losing_players, 1)-1 LOOP
      FOR j IN i+1..array_length(p_losing_players, 1) LOOP
        v_p1 := p_losing_players[i];
        v_p2 := p_losing_players[j];

        SELECT * INTO v_chemistry
        FROM get_player_pair_chemistry(v_p1, v_p2);

        IF v_chemistry IS NOT NULL AND v_chemistry.games_together >= 10 THEN
          DECLARE
            v_p1_name TEXT;
            v_p2_name TEXT;
            v_win_rate NUMERIC;
          BEGIN
            SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
            SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
            v_win_rate := ROUND((v_chemistry.wins_together::NUMERIC / v_chemistry.games_together) * 100, 1);

            IF v_win_rate <= 35 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'chemistry_curse', 4,
                format('Cursed combo? %s & %s lose again (%s%% together)', v_p1_name, v_p2_name, v_win_rate),
                jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name], 'win_rate', v_win_rate, 'games', v_chemistry.games_together),
                ARRAY[v_p1, v_p2]
              );
            END IF;
          END;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION _generate_chemistry_insights IS 'Helper: generates duo chemistry insights (kings, curse, milestone)';

-- =====================================================
-- HELPER FUNCTION: _generate_trio_insights
-- Handles: trio_dream_team, trio_cursed
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_trio_insights(
  p_game_id UUID,
  p_winning_players UUID[],
  p_losing_players UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_p1 UUID;
  v_p2 UUID;
  v_p3 UUID;
  v_trio_stats RECORD;
BEGIN
  -- Process winning team trios
  IF p_winning_players IS NOT NULL AND array_length(p_winning_players, 1) >= 3 THEN
    FOR i IN 1..array_length(p_winning_players, 1)-2 LOOP
      FOR j IN i+1..array_length(p_winning_players, 1)-1 LOOP
        FOR k IN j+1..array_length(p_winning_players, 1) LOOP
          v_p1 := p_winning_players[i];
          v_p2 := p_winning_players[j];
          v_p3 := p_winning_players[k];

          SELECT
            COUNT(*) as games,
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
              (gr1.team = 'orange' AND g.outcome = 'orange_win')
            ) as wins
          INTO v_trio_stats
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
          JOIN game_registrations gr3 ON gr1.game_id = gr3.game_id AND gr1.team = gr3.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2 AND gr3.player_id = v_p3
            AND gr1.status = 'selected' AND gr2.status = 'selected' AND gr3.status = 'selected'
            AND g.completed = true;

          IF v_trio_stats IS NOT NULL AND v_trio_stats.games >= 5 THEN
            DECLARE
              v_p1_name TEXT;
              v_p2_name TEXT;
              v_p3_name TEXT;
              v_win_rate NUMERIC;
            BEGIN
              SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
              SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
              SELECT friendly_name INTO v_p3_name FROM players WHERE id = v_p3;
              v_win_rate := ROUND((v_trio_stats.wins::NUMERIC / v_trio_stats.games) * 100, 1);

              IF v_win_rate >= 65 THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (
                  p_game_id, 'trio_dream_team', 3,
                  format('Dream team: %s/%s/%s win again (%s%% rate)', v_p1_name, v_p2_name, v_p3_name, v_win_rate),
                  jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name, v_p3_name], 'win_rate', v_win_rate, 'games', v_trio_stats.games),
                  ARRAY[v_p1, v_p2, v_p3]
                );
              END IF;
            END;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;

  -- Process losing team trios (cursed)
  IF p_losing_players IS NOT NULL AND array_length(p_losing_players, 1) >= 3 THEN
    FOR i IN 1..array_length(p_losing_players, 1)-2 LOOP
      FOR j IN i+1..array_length(p_losing_players, 1)-1 LOOP
        FOR k IN j+1..array_length(p_losing_players, 1) LOOP
          v_p1 := p_losing_players[i];
          v_p2 := p_losing_players[j];
          v_p3 := p_losing_players[k];

          SELECT
            COUNT(*) as games,
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
              (gr1.team = 'orange' AND g.outcome = 'orange_win')
            ) as wins
          INTO v_trio_stats
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
          JOIN game_registrations gr3 ON gr1.game_id = gr3.game_id AND gr1.team = gr3.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2 AND gr3.player_id = v_p3
            AND gr1.status = 'selected' AND gr2.status = 'selected' AND gr3.status = 'selected'
            AND g.completed = true;

          IF v_trio_stats IS NOT NULL AND v_trio_stats.games >= 5 THEN
            DECLARE
              v_p1_name TEXT;
              v_p2_name TEXT;
              v_p3_name TEXT;
              v_win_rate NUMERIC;
            BEGIN
              SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
              SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
              SELECT friendly_name INTO v_p3_name FROM players WHERE id = v_p3;
              v_win_rate := ROUND((v_trio_stats.wins::NUMERIC / v_trio_stats.games) * 100, 1);

              IF v_win_rate <= 35 THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (
                  p_game_id, 'trio_cursed', 4,
                  format('Cursed trio: %s/%s/%s lose again (%s%% rate)', v_p1_name, v_p2_name, v_p3_name, v_win_rate),
                  jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name, v_p3_name], 'win_rate', v_win_rate, 'games', v_trio_stats.games),
                  ARRAY[v_p1, v_p2, v_p3]
                );
              END IF;
            END;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION _generate_trio_insights IS 'Helper: generates trio chemistry insights (dream team, cursed)';

-- =====================================================
-- HELPER FUNCTION: _generate_rivalry_insights
-- Handles: all rivalry types (first_win, perfect, dominant, nemesis, close, revenge, never_beaten, etc.)
-- =====================================================
CREATE OR REPLACE FUNCTION _generate_rivalry_insights(
  p_game_id UUID,
  p_game RECORD,
  p_blue_players UUID[],
  p_orange_players UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_p1 UUID;
  v_p2 UUID;
  v_winners UUID[];
  v_losers UUID[];
BEGIN
  IF p_blue_players IS NULL OR p_orange_players IS NULL OR p_game.outcome IS NULL OR p_game.outcome = 'draw' THEN
    RETURN;
  END IF;

  -- Determine winners and losers
  IF p_game.outcome = 'blue_win' THEN
    v_winners := p_blue_players;
    v_losers := p_orange_players;
  ELSE
    v_winners := p_orange_players;
    v_losers := p_blue_players;
  END IF;

  -- NEVER BEATEN RIVALRY + FIRST EVER WIN NEMESIS
  IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
    FOREACH v_p1 IN ARRAY v_winners LOOP
      FOREACH v_p2 IN ARRAY v_losers LOOP
        DECLARE
          v_wins_before INTEGER;
          v_losses_before INTEGER;
          v_draws_before INTEGER;
          v_total_before INTEGER;
          v_winner_name TEXT;
          v_loser_name TEXT;
        BEGIN
          SELECT friendly_name INTO v_winner_name FROM players WHERE id = v_p1;
          SELECT friendly_name INTO v_loser_name FROM players WHERE id = v_p2;

          SELECT
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
              (gr1.team = 'orange' AND g.outcome = 'orange_win')
            ),
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'orange_win') OR
              (gr1.team = 'orange' AND g.outcome = 'blue_win')
            ),
            COUNT(*) FILTER (WHERE g.outcome = 'draw'),
            COUNT(*)
          INTO v_wins_before, v_losses_before, v_draws_before, v_total_before
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
            AND gr1.status = 'selected' AND gr2.status = 'selected'
            AND g.completed = true AND g.date < p_game.date;

          -- FIRST EVER WIN NEMESIS: 0 wins before, 5+ losses
          IF v_wins_before = 0 AND v_losses_before >= 5 THEN
            INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
            VALUES (
              p_game_id, 'first_ever_win_nemesis', 1,
              format('HISTORIC! %s beats %s for the FIRST TIME EVER (was 0-%s-%s)',
                v_winner_name, v_loser_name, v_draws_before, v_losses_before),
              jsonb_build_object('winner', v_winner_name, 'loser', v_loser_name,
                'previous_losses', v_losses_before, 'previous_draws', v_draws_before,
                'new_record', format('1-%s-%s', v_draws_before, v_losses_before)),
              ARRAY[v_p1, v_p2]
            );
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- NEVER BEATEN: From loser's perspective
  IF v_losers IS NOT NULL AND array_length(v_losers, 1) > 0 THEN
    FOREACH v_p1 IN ARRAY v_losers LOOP
      FOREACH v_p2 IN ARRAY v_winners LOOP
        DECLARE
          v_wins_total INTEGER;
          v_losses_total INTEGER;
          v_draws_total INTEGER;
          v_total INTEGER;
          v_loser_name TEXT;
          v_winner_name TEXT;
        BEGIN
          SELECT friendly_name INTO v_loser_name FROM players WHERE id = v_p1;
          SELECT friendly_name INTO v_winner_name FROM players WHERE id = v_p2;

          SELECT
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
              (gr1.team = 'orange' AND g.outcome = 'orange_win')
            ),
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'orange_win') OR
              (gr1.team = 'orange' AND g.outcome = 'blue_win')
            ),
            COUNT(*) FILTER (WHERE g.outcome = 'draw'),
            COUNT(*)
          INTO v_wins_total, v_losses_total, v_draws_total, v_total
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
            AND gr1.status = 'selected' AND gr2.status = 'selected'
            AND g.completed = true;

          IF v_wins_total = 0 AND v_total >= 5 THEN
            INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
            VALUES (
              p_game_id, 'never_beaten_rivalry', 3,
              format('Can they ever do it? %s is 0-%s-%s vs %s',
                v_loser_name, v_draws_total, v_losses_total, v_winner_name),
              jsonb_build_object('losing_player', v_loser_name, 'winning_player', v_winner_name,
                'record', format('0-%s-%s', v_draws_total, v_losses_total), 'total_games', v_total),
              ARRAY[v_p1, v_p2]
            );
          END IF;

          -- RIVALRY ONGOING DROUGHT
          IF v_losses_total >= 5 THEN
            DECLARE
              v_consecutive_losses INTEGER := 0;
            BEGIN
              SELECT COUNT(*) INTO v_consecutive_losses
              FROM (
                SELECT
                  CASE
                    WHEN (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
                         (gr1.team = 'orange' AND g.outcome = 'orange_win') THEN 'win'
                    ELSE 'loss'
                  END as result
                FROM game_registrations gr1
                JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
                JOIN games g ON gr1.game_id = g.id
                WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
                  AND gr1.status = 'selected' AND gr2.status = 'selected'
                  AND g.completed = true
                ORDER BY g.date DESC
              ) recent
              WHERE result = 'loss';

              IF v_consecutive_losses >= 5 AND v_wins_total > 0 THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (
                  p_game_id, 'rivalry_ongoing_drought', 4,
                  format('The drought continues: %s has now lost %s straight vs %s',
                    v_loser_name, v_consecutive_losses, v_winner_name),
                  jsonb_build_object('losing_player', v_loser_name, 'winning_player', v_winner_name,
                    'consecutive_losses', v_consecutive_losses, 'overall_record', format('%s-%s-%s', v_wins_total, v_draws_total, v_losses_total)),
                  ARRAY[v_p1, v_p2]
                );
              END IF;
            END;
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- ENHANCED RIVALRY INSIGHTS (nemesis, close, revenge)
  IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
    FOREACH v_p1 IN ARRAY v_winners LOOP
      FOREACH v_p2 IN ARRAY v_losers LOOP
        DECLARE
          v_wins INTEGER;
          v_losses INTEGER;
          v_draws INTEGER;
          v_total INTEGER;
          v_winner_name TEXT;
          v_loser_name TEXT;
          v_consecutive_losses_before INTEGER := 0;
        BEGIN
          SELECT friendly_name INTO v_winner_name FROM players WHERE id = v_p1;
          SELECT friendly_name INTO v_loser_name FROM players WHERE id = v_p2;

          SELECT
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
              (gr1.team = 'orange' AND g.outcome = 'orange_win')
            ),
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'orange_win') OR
              (gr1.team = 'orange' AND g.outcome = 'blue_win')
            ),
            COUNT(*) FILTER (WHERE g.outcome = 'draw'),
            COUNT(*)
          INTO v_wins, v_losses, v_draws, v_total
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
            AND gr1.status = 'selected' AND gr2.status = 'selected'
            AND g.completed = true;

          IF v_total >= 5 THEN
            -- Nemesis (10+ win advantage)
            IF v_wins - v_losses >= 10 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'rivalry_nemesis', 2,
                format('Nemesis! %s dominates %s (%s-%s-%s)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses),
                jsonb_build_object('dominant', v_winner_name, 'dominated', v_loser_name, 'record', format('%s-%s-%s', v_wins, v_draws, v_losses)),
                ARRAY[v_p1, v_p2]
              );
            -- Close rivalry (win diff <= 2, 15+ games)
            ELSIF v_total >= 15 AND ABS(v_wins - v_losses) <= 2 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'rivalry_close', 3,
                format('Neck and neck: %s vs %s now %s-%s-%s', v_winner_name, v_loser_name, v_wins, v_draws, v_losses),
                jsonb_build_object('player1', v_winner_name, 'player2', v_loser_name, 'record', format('%s-%s-%s', v_wins, v_draws, v_losses)),
                ARRAY[v_p1, v_p2]
              );
            END IF;

            -- Check for revenge
            SELECT COUNT(*) INTO v_consecutive_losses_before
            FROM (
              SELECT
                CASE
                  WHEN (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
                       (gr1.team = 'orange' AND g.outcome = 'orange_win') THEN 'win'
                  ELSE 'loss'
                END as result
              FROM game_registrations gr1
              JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
              JOIN games g ON gr1.game_id = g.id
              WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
                AND gr1.status = 'selected' AND gr2.status = 'selected'
                AND g.completed = true AND g.date < p_game.date
              ORDER BY g.date DESC
            ) recent
            WHERE result = 'loss'
            GROUP BY result
            HAVING COUNT(*) = (
              SELECT COUNT(*) FROM (
                SELECT
                  CASE
                    WHEN (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
                         (gr1.team = 'orange' AND g.outcome = 'orange_win') THEN 'win'
                    ELSE 'loss'
                  END as result
                FROM game_registrations gr1
                JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
                JOIN games g ON gr1.game_id = g.id
                WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
                  AND gr1.status = 'selected' AND gr2.status = 'selected'
                  AND g.completed = true AND g.date < p_game.date
                ORDER BY g.date DESC
                LIMIT 10
              ) sub
              WHERE result = 'loss'
            );

            IF v_consecutive_losses_before >= 3 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'rivalry_revenge', 2,
                format('Revenge! %s beats %s after %s straight losses', v_winner_name, v_loser_name, v_consecutive_losses_before),
                jsonb_build_object('winner', v_winner_name, 'loser', v_loser_name, 'ended_streak', v_consecutive_losses_before),
                ARRAY[v_p1, v_p2]
              );
            END IF;
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- RIVALRY FIRST WIN, PERFECT, DOMINANT (legacy insights)
  DECLARE
    v_wins_before INTEGER;
    v_wins_after INTEGER;
    v_losses_before INTEGER;
    v_draws_before INTEGER;
    v_games_against_before INTEGER;
  BEGIN
    IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
      FOREACH v_p1 IN ARRAY v_winners LOOP
        FOREACH v_p2 IN ARRAY v_losers LOOP
          DECLARE
            v_winner_name TEXT;
            v_loser_name TEXT;
          BEGIN
            SELECT friendly_name INTO v_winner_name FROM players WHERE id = v_p1;
            SELECT friendly_name INTO v_loser_name FROM players WHERE id = v_p2;

            SELECT
              COUNT(*) FILTER (WHERE
                (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
                (gr1.team = 'orange' AND g.outcome = 'orange_win')
              ),
              COUNT(*) FILTER (WHERE
                (gr1.team = 'blue' AND g.outcome = 'orange_win') OR
                (gr1.team = 'orange' AND g.outcome = 'blue_win')
              ),
              COUNT(*) FILTER (WHERE g.outcome = 'draw'),
              COUNT(*)
            INTO v_wins_before, v_losses_before, v_draws_before, v_games_against_before
            FROM game_registrations gr1
            JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
            JOIN games g ON gr1.game_id = g.id
            WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
              AND gr1.status = 'selected' AND gr2.status = 'selected'
              AND g.completed = true AND g.date < p_game.date;

            v_wins_after := v_wins_before + 1;

            IF v_games_against_before >= 2 THEN
              IF v_wins_before = 0 AND v_games_against_before >= 2 THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (
                  p_game_id, 'rivalry_first_win', 2,
                  format('First win! %s beat %s for the first time (was 0-%s-%s)',
                    v_winner_name, v_loser_name, v_draws_before, v_losses_before),
                  jsonb_build_object('winner', v_winner_name, 'loser', v_loser_name,
                    'record_after', format('%s-%s-%s', v_wins_after, v_draws_before, v_losses_before)),
                  ARRAY[v_p1, v_p2]
                );
              ELSIF v_losses_before = 0 AND v_games_against_before >= 4 THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (
                  p_game_id, 'rivalry_perfect', 2,
                  format('Perfect record: %s went %s-%s-%s vs %s',
                    v_winner_name, v_wins_after, v_draws_before, v_losses_before, v_loser_name),
                  jsonb_build_object('dominant', v_winner_name, 'dominated', v_loser_name,
                    'games', v_games_against_before + 1),
                  ARRAY[v_p1, v_p2]
                );
              ELSIF v_wins_after >= 5 THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (
                  p_game_id, 'rivalry_dominant', 3,
                  format('Dominant: %s beat %s again (%s-%s-%s)',
                    v_winner_name, v_loser_name, v_wins_after, v_draws_before, v_losses_before),
                  jsonb_build_object('dominant', v_winner_name,
                    'record', format('%s-%s-%s', v_wins_after, v_draws_before, v_losses_before)),
                  ARRAY[v_p1, v_p2]
                );
              END IF;
            END IF;
          END;
        END LOOP;
      END LOOP;
    END IF;
  END;
END;
$$;

COMMENT ON FUNCTION _generate_rivalry_insights IS 'Helper: generates all rivalry-related insights';

-- =====================================================
-- MAIN ORCHESTRATOR: generate_game_insights_on_demand
-- Now delegates to helper functions for cleaner code
-- =====================================================
CREATE OR REPLACE FUNCTION generate_game_insights_on_demand(p_game_id UUID)
RETURNS TABLE(analysis_type TEXT, priority INTEGER, headline TEXT, details JSONB, player_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_blue_players UUID[];
  v_orange_players UUID[];
  v_all_players UUID[];
  v_winning_players UUID[];
  v_losing_players UUID[];
BEGIN
  -- Get game details
  SELECT g.*, g.sequence_number INTO v_game
  FROM games g WHERE g.id = p_game_id;

  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found: %', p_game_id;
  END IF;

  -- Delete any existing analysis for this game
  DELETE FROM post_match_analysis WHERE post_match_analysis.game_id = p_game_id;

  -- Get players by team
  SELECT array_agg(gr.player_id) INTO v_blue_players
  FROM game_registrations gr
  WHERE gr.game_id = p_game_id AND gr.team = 'blue' AND gr.status = 'selected';

  SELECT array_agg(gr.player_id) INTO v_orange_players
  FROM game_registrations gr
  WHERE gr.game_id = p_game_id AND gr.team = 'orange' AND gr.status = 'selected';

  -- Combine all players
  v_all_players := COALESCE(v_blue_players, '{}'::UUID[]) || COALESCE(v_orange_players, '{}'::UUID[]);

  -- Determine winners and losers
  IF v_game.outcome = 'blue_win' THEN
    v_winning_players := v_blue_players;
    v_losing_players := v_orange_players;
  ELSIF v_game.outcome = 'orange_win' THEN
    v_winning_players := v_orange_players;
    v_losing_players := v_blue_players;
  END IF;

  -- =========================================================================
  -- CALL HELPER FUNCTIONS
  -- =========================================================================

  -- 1. Appearance insights (debuts, returns, bench promotions)
  PERFORM _generate_appearance_insights(p_game_id, v_game, v_all_players, v_winning_players);

  -- 2. Injury insights (injury absence, injury returns)
  PERFORM _generate_injury_insights(p_game_id, v_game);

  -- 3. Streak insights (attendance, win/loss streaks)
  PERFORM _generate_streak_insights(p_game_id, v_game, v_all_players);

  -- 4. Team color insights (loyalty, switches)
  PERFORM _generate_team_color_insights(p_game_id, v_game, v_all_players);

  -- 5. Game record insights (blowout, shutout, close games)
  PERFORM _generate_game_record_insights(p_game_id, v_game, v_winning_players);

  -- 6. Milestone insights (caps, partnerships)
  PERFORM _generate_milestone_insights(p_game_id, v_game, v_all_players, v_blue_players, v_orange_players);

  -- 7. Chemistry insights (duos)
  PERFORM _generate_chemistry_insights(p_game_id, v_winning_players, v_losing_players);

  -- 8. Trio insights
  PERFORM _generate_trio_insights(p_game_id, v_winning_players, v_losing_players);

  -- 9. Rivalry insights
  PERFORM _generate_rivalry_insights(p_game_id, v_game, v_blue_players, v_orange_players);

  -- Return all generated analysis
  RETURN QUERY
  SELECT pma.analysis_type, pma.priority, pma.headline, pma.details, pma.player_ids
  FROM post_match_analysis pma
  WHERE pma.game_id = p_game_id
  ORDER BY pma.priority, pma.created_at;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_game_insights_on_demand(UUID) TO authenticated;

COMMENT ON FUNCTION generate_game_insights_on_demand IS
'Main orchestrator for post-match insight generation.
Delegates to modular helper functions:
- _generate_appearance_insights: debuts, returns, bench promotions
- _generate_injury_insights: injury absence, injury returns
- _generate_streak_insights: attendance, win/loss streaks
- _generate_team_color_insights: team loyalty, switches
- _generate_game_record_insights: blowouts, shutouts, close games
- _generate_milestone_insights: caps, partnerships
- _generate_chemistry_insights: duo chemistry
- _generate_trio_insights: trio chemistry
- _generate_rivalry_insights: all rivalry types';

-- =====================================================
-- UPDATE WHATSAPP SUMMARY: Add injury category
-- =====================================================
CREATE OR REPLACE FUNCTION get_whatsapp_summary(p_game_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_summary TEXT := '';
  v_insight RECORD;
  v_count INTEGER := 0;
  v_max_insights INTEGER := 6;
  v_mentioned_players UUID[] := '{}';
  v_selected_ids UUID[] := '{}';
BEGIN
  -- Get game details
  SELECT g.*, g.sequence_number INTO v_game
  FROM games g WHERE g.id = p_game_id;

  IF v_game IS NULL THEN
    RETURN 'Game not found';
  END IF;

  -- Build header
  v_summary := format('🏟️ *WNF #%s*: ', v_game.sequence_number);

  IF v_game.outcome = 'blue_win' THEN
    v_summary := v_summary || format('🔵 Blue %s-%s Orange 🟠', v_game.score_blue, v_game.score_orange);
  ELSIF v_game.outcome = 'orange_win' THEN
    v_summary := v_summary || format('🔵 Blue %s-%s Orange 🟠', v_game.score_blue, v_game.score_orange);
  ELSE
    v_summary := v_summary || format('🔵 Blue %s-%s Orange 🟠 (Draw)', v_game.score_blue, v_game.score_orange);
  END IF;

  v_summary := v_summary || E'\n\n📊 *Post-Match Analysis*\n';

  -- PHASE 1: Select best insight from each category (ensures type variety)
  -- Only select POSITIVE insights - exclude negative types
  FOR v_insight IN
    WITH positive_insights AS (
      SELECT
        id,
        headline,
        analysis_type,
        priority,
        player_ids,
        created_at,
        CASE
          WHEN analysis_type LIKE 'trophy%' THEN 'trophy'
          WHEN analysis_type LIKE 'rivalry%' THEN 'rivalry'
          WHEN analysis_type LIKE 'partnership%' THEN 'partnership'
          WHEN analysis_type LIKE 'chemistry_kings%' OR analysis_type = 'chemistry_milestone' THEN 'chemistry'
          WHEN analysis_type LIKE 'trio_dream%' THEN 'trio'
          WHEN analysis_type = 'cap_milestone' OR analysis_type LIKE 'attendance%' THEN 'cap'
          WHEN analysis_type IN ('win_streak', 'unbeaten_streak', 'streak_milestone', 'losing_streak_ended', 'winless_streak_ended') THEN 'streak'
          WHEN analysis_type = 'game_record' OR analysis_type LIKE 'team_best%' OR analysis_type LIKE 'blowout%' OR analysis_type LIKE 'shutout%' THEN 'record'
          WHEN analysis_type IN ('debut_appearance', 'return_after_absence', 'first_game_back_win') THEN 'appearance'
          WHEN analysis_type LIKE 'award%' THEN 'award'
          WHEN analysis_type = 'injury_token_return' THEN 'injury'  -- Injury returns are positive
          ELSE 'other'
        END as category
      FROM post_match_analysis
      WHERE game_id = p_game_id
        -- Exclude negative insight types from headlines
        AND analysis_type NOT IN (
          'chemistry_curse',
          'trio_cursed',
          'losing_streak',
          'winless_streak',
          'rivalry_nemesis',  -- This is negative for the victim
          'player_color_curse',
          'injury_token_used'  -- Injury absence is informational, not celebratory
        )
    ),
    -- Get best insight from each category
    best_per_category AS (
      SELECT DISTINCT ON (category)
        id, headline, analysis_type, priority, player_ids, created_at, category
      FROM positive_insights
      ORDER BY category, priority, created_at
    )
    SELECT id, headline, player_ids
    FROM best_per_category
    ORDER BY priority, created_at
    LIMIT v_max_insights
  LOOP
    v_count := v_count + 1;
    v_summary := v_summary || format(E'\n%s. %s', v_count, v_insight.headline);
    v_selected_ids := v_selected_ids || v_insight.id;
    -- Track mentioned players (but only first 3 to avoid team-wide insights polluting)
    IF v_insight.player_ids IS NOT NULL AND array_length(v_insight.player_ids, 1) <= 5 THEN
      v_mentioned_players := v_mentioned_players || v_insight.player_ids;
    END IF;
  END LOOP;

  -- PHASE 2: Fill remaining slots with insights that mention NEW players
  -- Still excluding negative types
  IF v_count < v_max_insights THEN
    FOR v_insight IN
      SELECT
        id,
        headline,
        player_ids,
        -- Calculate how many NEW players this insight would add
        (
          SELECT COUNT(*)
          FROM unnest(pma.player_ids) AS pid
          WHERE pid != ALL(v_mentioned_players)
        ) as new_player_count
      FROM post_match_analysis pma
      WHERE game_id = p_game_id
        AND id != ALL(v_selected_ids)
        -- Exclude negative insight types
        AND analysis_type NOT IN (
          'chemistry_curse',
          'trio_cursed',
          'losing_streak',
          'winless_streak',
          'rivalry_nemesis',
          'player_color_curse',
          'injury_token_used'
        )
        -- Only consider insights with <= 5 players (skip team-wide)
        AND (player_ids IS NULL OR array_length(player_ids, 1) <= 5)
      ORDER BY
        -- Prefer insights that mention new players
        (SELECT COUNT(*) FROM unnest(pma.player_ids) AS pid WHERE pid != ALL(v_mentioned_players)) DESC,
        priority,
        created_at
      LIMIT (v_max_insights - v_count)
    LOOP
      v_count := v_count + 1;
      v_summary := v_summary || format(E'\n%s. %s', v_count, v_insight.headline);
      IF v_insight.player_ids IS NOT NULL THEN
        v_mentioned_players := v_mentioned_players || v_insight.player_ids;
      END IF;
    END LOOP;
  END IF;

  IF v_count = 0 THEN
    v_summary := v_summary || E'\nNo notable changes this week.';
  END IF;

  RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION get_whatsapp_summary(UUID) IS
'Generates a WhatsApp-friendly summary of post-match analysis.
Phase 1: Selects one insight from each category (ensuring type variety).
Phase 2: Fills remaining slots preferring insights with NEW player names.
Excludes negative insight types (cursed trios, losing streaks, injury absences, etc.) from headlines.
Includes injury_token_return in the injury category (positive/celebratory).';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- 1. Created modular helper functions:
--    - _generate_appearance_insights (debuts, returns, bench promotions)
--    - _generate_injury_insights (injury absence + return)
--    - _generate_streak_insights (attendance, win/loss streaks)
--    - _generate_team_color_insights (loyalty, switches)
--    - _generate_game_record_insights (blowouts, shutouts, records)
--    - _generate_milestone_insights (caps, partnerships)
--    - _generate_chemistry_insights (duo chemistry)
--    - _generate_trio_insights (trio chemistry)
--    - _generate_rivalry_insights (all rivalry types)
-- 2. Refactored main orchestrator to call helpers
-- 3. Added injury_token_used and injury_token_return insight types
-- 4. Updated WhatsApp summary to include injury category
