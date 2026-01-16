-- Enhanced Post-Match Insights v2
-- Adds 17 new insight types for richer game narratives
-- Types: return_after_absence, attendance_streak, attendance_streak_ended,
--        never_beaten_rivalry, first_ever_win_nemesis, debut_appearance,
--        bench_warmer_promoted, team_color_loyalty, team_color_switch,
--        first_game_back_win, rivalry_ongoing_drought, personal_best_streak,
--        blowout_game, shutout_game

-- =========================================================================
-- UPDATE: generate_game_insights_on_demand with 17 new insight types
-- =========================================================================
CREATE OR REPLACE FUNCTION generate_game_insights_on_demand(p_game_id UUID)
RETURNS TABLE(analysis_type TEXT, priority INTEGER, headline TEXT, details JSONB, player_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_prev_game RECORD;
  v_blue_players UUID[];
  v_orange_players UUID[];
  v_all_players UUID[];
  v_winning_players UUID[];
  v_losing_players UUID[];
  v_p1 UUID;
  v_p2 UUID;
  v_p3 UUID;
  v_player RECORD;
  v_caps_before INTEGER;
  v_caps_after INTEGER;
  v_games_together_before INTEGER;
  v_games_together_after INTEGER;
  v_wins_together_before INTEGER;
  v_wins_together_after INTEGER;
  v_rivalry_before RECORD;
  v_rivalry_after RECORD;
  v_cap_milestone INTEGER;
  v_team_streak INTEGER;
  v_streaks_before RECORD;
  v_streaks_after RECORD;
  v_chemistry RECORD;
  v_trio_stats RECORD;
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
  -- NEW: DEBUT APPEARANCE
  -- First ever WNF game for a player
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(v_all_players)
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

      IF v_first_game_seq = v_game.sequence_number THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'debut_appearance', 3,
          format('Welcome to WNF! %s makes their debut', v_player.friendly_name),
          jsonb_build_object('player_id', v_player.id, 'player_name', v_player.friendly_name, 'game_number', v_game.sequence_number),
          ARRAY[v_player.id]
        );
      END IF;
    END;
  END LOOP;

  -- =========================================================================
  -- NEW: RETURN AFTER ABSENCE
  -- Player returns after missing 5+ games
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(v_all_players)
  LOOP
    DECLARE
      v_prev_game_seq INTEGER;
      v_games_missed INTEGER;
    BEGIN
      -- Get the sequence number of their previous game
      SELECT MAX(g.sequence_number) INTO v_prev_game_seq
      FROM game_registrations gr
      JOIN games g ON gr.game_id = g.id
      WHERE gr.player_id = v_player.id
        AND gr.status = 'selected'
        AND g.completed = true
        AND g.sequence_number < v_game.sequence_number;

      IF v_prev_game_seq IS NOT NULL THEN
        v_games_missed := v_game.sequence_number - v_prev_game_seq - 1;

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

  -- =========================================================================
  -- NEW: FIRST GAME BACK WIN
  -- Player wins on return after 5+ game absence
  -- =========================================================================
  IF v_winning_players IS NOT NULL THEN
    FOR v_player IN
      SELECT p.id, p.friendly_name
      FROM players p
      WHERE p.id = ANY(v_winning_players)
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
          AND g.sequence_number < v_game.sequence_number;

        IF v_prev_game_seq IS NOT NULL THEN
          v_games_missed := v_game.sequence_number - v_prev_game_seq - 1;

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

  -- =========================================================================
  -- NEW: ATTENDANCE STREAK
  -- Player achieves 10/20/30+ consecutive games
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(v_all_players)
  LOOP
    DECLARE
      v_current_streak INTEGER := 0;
      v_check_seq INTEGER;
    BEGIN
      -- Count backwards from current game to find streak
      v_check_seq := v_game.sequence_number;

      LOOP
        -- Check if player played in this sequence number
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

        -- Safety limit
        IF v_current_streak > 100 THEN EXIT; END IF;
      END LOOP;

      -- Generate insight for milestone streaks
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

  -- =========================================================================
  -- NEW: BENCH WARMER PROMOTED
  -- Player was reserve 3+ consecutive times, now selected
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(v_all_players)
  LOOP
    DECLARE
      v_reserve_streak INTEGER := 0;
    BEGIN
      -- Count consecutive reserve appearances before this game
      SELECT COUNT(*) INTO v_reserve_streak
      FROM (
        SELECT gr.status, g.sequence_number
        FROM game_registrations gr
        JOIN games g ON gr.game_id = g.id
        WHERE gr.player_id = v_player.id
          AND g.sequence_number < v_game.sequence_number
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
          AND g2.sequence_number < v_game.sequence_number
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

  -- =========================================================================
  -- NEW: TEAM COLOR LOYALTY
  -- Player plays Blue/Orange 70%+ of time (20+ games)
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name, gr.team as current_team
    FROM players p
    JOIN game_registrations gr ON p.id = gr.player_id
    WHERE p.id = ANY(v_all_players)
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

  -- =========================================================================
  -- NEW: TEAM COLOR SWITCH
  -- Player plays unusual team color after 5+ game streak on other team
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name, gr.team as current_team
    FROM players p
    JOIN game_registrations gr ON p.id = gr.player_id
    WHERE p.id = ANY(v_all_players)
      AND gr.game_id = p_game_id
      AND gr.status = 'selected'
  LOOP
    DECLARE
      v_other_team_streak INTEGER := 0;
      v_other_team TEXT;
    BEGIN
      v_other_team := CASE WHEN v_player.current_team = 'blue' THEN 'orange' ELSE 'blue' END;

      -- Count consecutive games on the OTHER team before this
      SELECT COUNT(*) INTO v_other_team_streak
      FROM (
        SELECT gr.team
        FROM game_registrations gr
        JOIN games g ON gr.game_id = g.id
        WHERE gr.player_id = v_player.id
          AND gr.status = 'selected'
          AND g.completed = true
          AND g.sequence_number < v_game.sequence_number
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

  -- =========================================================================
  -- NEW: BLOWOUT GAME
  -- Score margin of 5+ goals
  -- =========================================================================
  IF ABS(COALESCE(v_game.score_blue, 0) - COALESCE(v_game.score_orange, 0)) >= 5 THEN
    DECLARE
      v_winning_team TEXT;
      v_winning_score INTEGER;
      v_losing_score INTEGER;
    BEGIN
      IF v_game.score_blue > v_game.score_orange THEN
        v_winning_team := 'Blue';
        v_winning_score := v_game.score_blue;
        v_losing_score := v_game.score_orange;
      ELSE
        v_winning_team := 'Orange';
        v_winning_score := v_game.score_orange;
        v_losing_score := v_game.score_blue;
      END IF;

      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'blowout_game', 3,
        format('Dominant display! %s demolishes opposition %s-%s', v_winning_team, v_winning_score, v_losing_score),
        jsonb_build_object('winning_team', v_winning_team, 'margin', v_winning_score - v_losing_score,
          'score_blue', v_game.score_blue, 'score_orange', v_game.score_orange),
        COALESCE(v_winning_players, '{}'::UUID[])
      );
    END;
  END IF;

  -- =========================================================================
  -- NEW: SHUTOUT GAME
  -- One team scores 0
  -- =========================================================================
  IF (v_game.score_blue = 0 OR v_game.score_orange = 0) AND v_game.outcome != 'draw' THEN
    DECLARE
      v_winning_team TEXT;
      v_winning_score INTEGER;
    BEGIN
      IF v_game.score_orange = 0 THEN
        v_winning_team := 'Blue';
        v_winning_score := v_game.score_blue;
      ELSE
        v_winning_team := 'Orange';
        v_winning_score := v_game.score_orange;
      END IF;

      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'shutout_game', 3,
        format('Clean sheet! %s keeps opposition scoreless (%s-0)', v_winning_team, v_winning_score),
        jsonb_build_object('winning_team', v_winning_team, 'score', v_winning_score,
          'score_blue', v_game.score_blue, 'score_orange', v_game.score_orange),
        COALESCE(v_winning_players, '{}'::UUID[])
      );
    END;
  END IF;

  -- =========================================================================
  -- NEW: NEVER BEATEN RIVALRY + FIRST EVER WIN NEMESIS
  -- Player has 0 wins vs opponent after 5+ games / First win against longtime nemesis
  -- =========================================================================
  IF v_blue_players IS NOT NULL AND v_orange_players IS NOT NULL AND v_game.outcome IS NOT NULL AND v_game.outcome != 'draw' THEN
    DECLARE
      v_winners UUID[];
      v_losers UUID[];
    BEGIN
      IF v_game.outcome = 'blue_win' THEN
        v_winners := v_blue_players;
        v_losers := v_orange_players;
      ELSE
        v_winners := v_orange_players;
        v_losers := v_blue_players;
      END IF;

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

              -- Get H2H record BEFORE this game (from winner's perspective)
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
                AND g.completed = true AND g.date < v_game.date;

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

      -- NEVER BEATEN RIVALRY: From loser's perspective - they still have 0 wins
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

              -- Get H2H record INCLUDING this game (from loser's perspective)
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

              -- NEVER BEATEN: 0 wins, 5+ games total
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

              -- RIVALRY ONGOING DROUGHT: Extending losing streak (5+ losses in a row)
              IF v_losses_total >= 5 THEN
                DECLARE
                  v_consecutive_losses INTEGER := 0;
                BEGIN
                  -- Count consecutive losses including this game
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
    END;
  END IF;

  -- =========================================================================
  -- INDIVIDUAL WIN/LOSS STREAKS (existing)
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(v_all_players)
  LOOP
    -- Get streaks BEFORE this game
    SELECT * INTO v_streaks_before
    FROM calculate_player_streaks_before_game(v_player.id, v_game.date);

    -- Determine this game's result for this player
    DECLARE
      v_this_result TEXT;
      v_player_team TEXT;
    BEGIN
      SELECT gr.team INTO v_player_team
      FROM game_registrations gr
      WHERE gr.game_id = p_game_id AND gr.player_id = v_player.id;

      IF (v_player_team = 'blue' AND v_game.outcome = 'blue_win') OR
         (v_player_team = 'orange' AND v_game.outcome = 'orange_win') THEN
        v_this_result := 'win';
      ELSIF v_game.outcome = 'draw' THEN
        v_this_result := 'draw';
      ELSE
        v_this_result := 'loss';
      END IF;

      -- Win streak insights
      IF v_this_result = 'win' THEN
        -- Extending win streak (3+ games)
        IF v_streaks_before.win_streak >= 2 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'win_streak', 2,
            format('On fire! %s wins %s in a row', v_player.friendly_name, v_streaks_before.win_streak + 1),
            jsonb_build_object('player', v_player.friendly_name, 'streak', v_streaks_before.win_streak + 1),
            ARRAY[v_player.id]
          );
        END IF;

        -- Ending losing streak (3+ games)
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
        -- Win streak ended (3+ games)
        IF v_streaks_before.win_streak >= 3 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'win_streak_ended', 3,
            format('Streak ended: %s''s %s-game win streak broken', v_player.friendly_name, v_streaks_before.win_streak),
            jsonb_build_object('player', v_player.friendly_name, 'ended_streak', v_streaks_before.win_streak),
            ARRAY[v_player.id]
          );
        END IF;

        -- Extending losing streak (4+ games)
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

      -- Unbeaten streak (5+ games, win or draw)
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

  -- =========================================================================
  -- DUO CHEMISTRY INSIGHTS (existing - same team pairs)
  -- =========================================================================
  -- Process winning team pairs
  IF v_winning_players IS NOT NULL AND array_length(v_winning_players, 1) >= 2 THEN
    FOR i IN 1..array_length(v_winning_players, 1)-1 LOOP
      FOR j IN i+1..array_length(v_winning_players, 1) LOOP
        v_p1 := v_winning_players[i];
        v_p2 := v_winning_players[j];

        -- Get chemistry stats
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

            -- Chemistry kings (60%+ win rate together)
            IF v_win_rate >= 60 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'chemistry_kings', 3,
                format('Chemistry kings: %s & %s win again (%s%% together)', v_p1_name, v_p2_name, v_win_rate),
                jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name], 'win_rate', v_win_rate, 'games', v_chemistry.games_together),
                ARRAY[v_p1, v_p2]
              );
            END IF;

            -- Win milestones together (10, 20, 30...)
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
  IF v_losing_players IS NOT NULL AND array_length(v_losing_players, 1) >= 2 THEN
    FOR i IN 1..array_length(v_losing_players, 1)-1 LOOP
      FOR j IN i+1..array_length(v_losing_players, 1) LOOP
        v_p1 := v_losing_players[i];
        v_p2 := v_losing_players[j];

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

            -- Chemistry curse (35% or less win rate together)
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

  -- =========================================================================
  -- TRIO CHEMISTRY INSIGHTS (existing)
  -- =========================================================================
  -- Process winning team trios
  IF v_winning_players IS NOT NULL AND array_length(v_winning_players, 1) >= 3 THEN
    FOR i IN 1..array_length(v_winning_players, 1)-2 LOOP
      FOR j IN i+1..array_length(v_winning_players, 1)-1 LOOP
        FOR k IN j+1..array_length(v_winning_players, 1) LOOP
          v_p1 := v_winning_players[i];
          v_p2 := v_winning_players[j];
          v_p3 := v_winning_players[k];

          -- Calculate trio stats manually (simplified version)
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

              -- Dream team trio (65%+ win rate)
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
  IF v_losing_players IS NOT NULL AND array_length(v_losing_players, 1) >= 3 THEN
    FOR i IN 1..array_length(v_losing_players, 1)-2 LOOP
      FOR j IN i+1..array_length(v_losing_players, 1)-1 LOOP
        FOR k IN j+1..array_length(v_losing_players, 1) LOOP
          v_p1 := v_losing_players[i];
          v_p2 := v_losing_players[j];
          v_p3 := v_losing_players[k];

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

              -- Cursed trio (35% or less win rate)
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

  -- =========================================================================
  -- ENHANCED RIVALRY INSIGHTS (existing)
  -- =========================================================================
  IF v_blue_players IS NOT NULL AND v_orange_players IS NOT NULL AND v_game.outcome IS NOT NULL AND v_game.outcome != 'draw' THEN
    DECLARE
      v_winners UUID[];
      v_losers UUID[];
    BEGIN
      IF v_game.outcome = 'blue_win' THEN
        v_winners := v_blue_players;
        v_losers := v_orange_players;
      ELSE
        v_winners := v_orange_players;
        v_losers := v_blue_players;
      END IF;

      IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
        FOREACH v_p1 IN ARRAY v_winners LOOP
          FOREACH v_p2 IN ARRAY v_losers LOOP
            -- Calculate H2H record
            DECLARE
              v_wins INTEGER;
              v_losses INTEGER;
              v_draws INTEGER;
              v_total INTEGER;
              v_winner_name TEXT;
              v_loser_name TEXT;
              v_consecutive_wins INTEGER := 0;
              v_consecutive_losses_before INTEGER := 0;
            BEGIN
              SELECT friendly_name INTO v_winner_name FROM players WHERE id = v_p1;
              SELECT friendly_name INTO v_loser_name FROM players WHERE id = v_p2;

              -- Get overall H2H record
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

                -- Check for revenge (ending a losing streak vs this opponent)
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
                    AND g.completed = true AND g.date < v_game.date
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
                      AND g.completed = true AND g.date < v_game.date
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
    END;
  END IF;

  -- =========================================================================
  -- EXISTING INSIGHTS (CAP MILESTONES, PARTNERSHIPS, etc.)
  -- =========================================================================

  -- CAP MILESTONES
  FOR v_player IN
    SELECT p.id, p.friendly_name
    FROM players p
    WHERE p.id = ANY(v_all_players)
  LOOP
    SELECT COUNT(*) INTO v_caps_before
    FROM game_registrations gr
    JOIN games g ON gr.game_id = g.id
    WHERE gr.player_id = v_player.id
      AND gr.status = 'selected'
      AND g.completed = true
      AND g.date < v_game.date;

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
  IF v_blue_players IS NOT NULL AND array_length(v_blue_players, 1) >= 2 THEN
    FOR i IN 1..array_length(v_blue_players, 1)-1 LOOP
      FOR j IN i+1..array_length(v_blue_players, 1) LOOP
        v_p1 := v_blue_players[i];
        v_p2 := v_blue_players[j];

        SELECT COUNT(*) INTO v_games_together_before
        FROM game_registrations gr1
        JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
          AND gr1.status = 'selected' AND gr2.status = 'selected'
          AND g.completed = true AND g.date < v_game.date;

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

  -- Orange team partnerships
  IF v_orange_players IS NOT NULL AND array_length(v_orange_players, 1) >= 2 THEN
    FOR i IN 1..array_length(v_orange_players, 1)-1 LOOP
      FOR j IN i+1..array_length(v_orange_players, 1) LOOP
        v_p1 := v_orange_players[i];
        v_p2 := v_orange_players[j];

        SELECT COUNT(*) INTO v_games_together_before
        FROM game_registrations gr1
        JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
          AND gr1.status = 'selected' AND gr2.status = 'selected'
          AND g.completed = true AND g.date < v_game.date;

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

  -- RIVALRY INSIGHTS (existing - first win, perfect, dominant)
  IF v_blue_players IS NOT NULL AND v_orange_players IS NOT NULL AND v_game.outcome IS NOT NULL AND v_game.outcome != 'draw' THEN
    DECLARE
      v_winners UUID[];
      v_losers UUID[];
      v_wins_before INTEGER;
      v_wins_after INTEGER;
      v_losses_before INTEGER;
      v_draws_before INTEGER;
      v_games_against_before INTEGER;
    BEGIN
      IF v_game.outcome = 'blue_win' THEN
        v_winners := v_blue_players;
        v_losers := v_orange_players;
      ELSE
        v_winners := v_orange_players;
        v_losers := v_blue_players;
      END IF;

      IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
        FOREACH v_p1 IN ARRAY v_winners LOOP
          FOREACH v_p2 IN ARRAY v_losers LOOP
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
              AND g.completed = true AND g.date < v_game.date;

            v_wins_after := v_wins_before + 1;

            IF v_games_against_before >= 2 THEN
              DECLARE
                v_winner_name TEXT;
                v_loser_name TEXT;
              BEGIN
                SELECT friendly_name INTO v_winner_name FROM players WHERE id = v_p1;
                SELECT friendly_name INTO v_loser_name FROM players WHERE id = v_p2;

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
              END;
            END IF;
          END LOOP;
        END LOOP;
      END IF;
    END;
  END IF;

  -- TEAM COLOR STREAKS
  IF v_game.outcome IN ('blue_win', 'orange_win') THEN
    SELECT COUNT(*) INTO v_team_streak
    FROM (
      SELECT g.id, g.outcome
      FROM games g
      WHERE g.completed = true AND g.date <= v_game.date
      ORDER BY g.date DESC
      LIMIT 10
    ) recent
    WHERE recent.outcome = v_game.outcome;

    IF v_team_streak >= 3 THEN
      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'team_streak', 5,
        format('%s won %s in a row!',
          CASE WHEN v_game.outcome = 'blue_win' THEN 'Blue' ELSE 'Orange' END,
          v_team_streak),
        jsonb_build_object('team', v_game.outcome, 'streak', v_team_streak),
        '{}'::UUID[]
      );
    END IF;
  END IF;

  -- GAME RECORDS
  IF COALESCE(v_game.score_blue, 0) + COALESCE(v_game.score_orange, 0) >= 10 THEN
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (
      p_game_id, 'game_record', 5,
      format('Goal fest! WNF #%s finished %s-%s', v_game.sequence_number, v_game.score_blue, v_game.score_orange),
      jsonb_build_object('total_goals', v_game.score_blue + v_game.score_orange),
      '{}'::UUID[]
    );
  END IF;

  IF ABS(COALESCE(v_game.score_blue, 0) - COALESCE(v_game.score_orange, 0)) <= 1 THEN
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (
      p_game_id, 'game_record', 5,
      CASE WHEN v_game.score_blue = v_game.score_orange
        THEN format('Honours even! WNF #%s ended %s-%s', v_game.sequence_number, v_game.score_blue, v_game.score_orange)
        ELSE format('Nail-biter! WNF #%s decided by a single goal (%s-%s)', v_game.sequence_number, v_game.score_blue, v_game.score_orange)
      END,
      jsonb_build_object('margin', ABS(v_game.score_blue - v_game.score_orange)),
      '{}'::UUID[]
    );
  END IF;

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
