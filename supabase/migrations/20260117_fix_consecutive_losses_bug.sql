-- Fix for rivalry_ongoing_drought consecutive losses calculation bug
-- The previous query counted TOTAL losses instead of CONSECUTIVE losses
-- This migration fixes the function and cleans up incorrect insights

-- =========================================================================
-- STEP 1: Delete all incorrect rivalry_ongoing_drought insights
-- =========================================================================
DELETE FROM post_match_analysis WHERE analysis_type = 'rivalry_ongoing_drought';

-- =========================================================================
-- STEP 2: Update the generate_game_insights_on_demand function with fixed logic
-- =========================================================================
CREATE OR REPLACE FUNCTION generate_game_insights_on_demand(p_game_id UUID)
RETURNS TABLE(analysis_type TEXT, priority INTEGER, headline TEXT, details JSONB, player_ids UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p_game RECORD;
  v_winners UUID[];
  v_losers UUID[];
  v_all_players UUID[];
  v_p1 UUID;
  v_p2 UUID;
  v_p3 UUID;
BEGIN
  -- Get game details
  SELECT * INTO p_game FROM games WHERE id = p_game_id;
  IF p_game IS NULL THEN
    RAISE EXCEPTION 'Game not found: %', p_game_id;
  END IF;

  -- Get winning and losing team players
  IF p_game.outcome = 'blue_win' THEN
    SELECT ARRAY_AGG(player_id) INTO v_winners
    FROM game_registrations WHERE game_id = p_game_id AND status = 'selected' AND team = 'blue';
    SELECT ARRAY_AGG(player_id) INTO v_losers
    FROM game_registrations WHERE game_id = p_game_id AND status = 'selected' AND team = 'orange';
  ELSIF p_game.outcome = 'orange_win' THEN
    SELECT ARRAY_AGG(player_id) INTO v_winners
    FROM game_registrations WHERE game_id = p_game_id AND status = 'selected' AND team = 'orange';
    SELECT ARRAY_AGG(player_id) INTO v_losers
    FROM game_registrations WHERE game_id = p_game_id AND status = 'selected' AND team = 'blue';
  ELSE
    -- Draw - no winners/losers
    v_winners := NULL;
    v_losers := NULL;
  END IF;

  -- Get all selected players
  SELECT ARRAY_AGG(player_id) INTO v_all_players
  FROM game_registrations WHERE game_id = p_game_id AND status = 'selected';

  -- =========================================================================
  -- TROPHY INSIGHTS (Hall of Fame changes)
  -- =========================================================================
  -- Trophy holder retained
  RETURN QUERY
  SELECT 'trophy_retained'::TEXT, 3,
    format('Still the champ! %s retains %s trophy', tc.holder_name, tc.award_name),
    jsonb_build_object('holder', tc.holder_name, 'trophy', tc.award_name, 'games_held', tc.games_held),
    ARRAY[tc.current_holder_id]
  FROM trophy_changes tc
  WHERE tc.game_id = p_game_id AND tc.change_type = 'retained';

  -- Trophy changed hands
  RETURN QUERY
  SELECT 'trophy_change'::TEXT, 2,
    format('Dethroned! %s takes %s trophy from %s', tc.new_holder_name, tc.award_name, tc.holder_name),
    jsonb_build_object('new_holder', tc.new_holder_name, 'previous_holder', tc.holder_name,
      'trophy', tc.award_name, 'games_held_by_previous', tc.games_held),
    ARRAY[tc.new_holder_id, tc.current_holder_id]
  FROM trophy_changes tc
  WHERE tc.game_id = p_game_id AND tc.change_type = 'changed';

  -- Long reign ended
  RETURN QUERY
  SELECT 'trophy_long_reign_ended'::TEXT, 1,
    format('End of an era! %s loses %s after %s games', tc.holder_name, tc.award_name, tc.games_held),
    jsonb_build_object('holder', tc.holder_name, 'trophy', tc.award_name, 'games_held', tc.games_held,
      'new_holder', tc.new_holder_name),
    ARRAY[tc.current_holder_id, tc.new_holder_id]
  FROM trophy_changes tc
  WHERE tc.game_id = p_game_id AND tc.change_type = 'changed' AND tc.games_held >= 10;

  -- =========================================================================
  -- STREAK INSIGHTS
  -- =========================================================================
  -- Personal win streaks
  IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
    FOREACH v_p1 IN ARRAY v_winners LOOP
      DECLARE
        v_streak INTEGER;
        v_player_name TEXT;
      BEGIN
        SELECT friendly_name INTO v_player_name FROM players WHERE id = v_p1;

        SELECT COUNT(*) INTO v_streak
        FROM (
          SELECT g.id,
            CASE WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR
                      (gr.team = 'orange' AND g.outcome = 'orange_win') THEN 'W'
                 ELSE 'X' END as result,
            ROW_NUMBER() OVER (ORDER BY g.date DESC) as rn
          FROM game_registrations gr
          JOIN games g ON gr.game_id = g.id
          WHERE gr.player_id = v_p1 AND gr.status = 'selected' AND g.completed = true
          ORDER BY g.date DESC
        ) recent
        WHERE result = 'W' AND rn <= (
          SELECT COALESCE(MIN(rn) - 1, (SELECT COUNT(*) FROM game_registrations gr JOIN games g ON gr.game_id = g.id WHERE gr.player_id = v_p1 AND gr.status = 'selected' AND g.completed = true))
          FROM (
            SELECT ROW_NUMBER() OVER (ORDER BY g.date DESC) as rn,
              CASE WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR
                        (gr.team = 'orange' AND g.outcome = 'orange_win') THEN 'W'
                   ELSE 'X' END as result
            FROM game_registrations gr
            JOIN games g ON gr.game_id = g.id
            WHERE gr.player_id = v_p1 AND gr.status = 'selected' AND g.completed = true
          ) sub WHERE result = 'X'
        );

        IF v_streak >= 4 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'winning_streak', 2,
            format('On fire! %s wins %s in a row', v_player_name, v_streak),
            jsonb_build_object('player', v_player_name, 'streak', v_streak),
            ARRAY[v_p1]
          );
        END IF;
      END;
    END LOOP;
  END IF;

  -- Personal losing streaks ended
  IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
    FOREACH v_p1 IN ARRAY v_winners LOOP
      DECLARE
        v_prev_streak INTEGER := 0;
        v_player_name TEXT;
      BEGIN
        SELECT friendly_name INTO v_player_name FROM players WHERE id = v_p1;

        -- Count consecutive losses BEFORE this game (excluding this game)
        WITH ordered_games AS (
          SELECT
            g.id,
            CASE WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR
                      (gr.team = 'orange' AND g.outcome = 'orange_win') THEN 'win'
                 WHEN g.outcome = 'draw' THEN 'draw'
                 ELSE 'loss' END as result,
            ROW_NUMBER() OVER (ORDER BY g.date DESC) as rn
          FROM game_registrations gr
          JOIN games g ON gr.game_id = g.id
          WHERE gr.player_id = v_p1 AND gr.status = 'selected' AND g.completed = true
            AND g.date < p_game.date
          ORDER BY g.date DESC
        ),
        first_non_loss AS (
          SELECT MIN(rn) as first_break FROM ordered_games WHERE result != 'loss'
        )
        SELECT COALESCE(
          (SELECT first_break - 1 FROM first_non_loss WHERE first_break IS NOT NULL),
          (SELECT COUNT(*) FROM ordered_games)
        ) INTO v_prev_streak;

        IF v_prev_streak >= 4 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'losing_streak_ended', 2,
            format('Finally! %s ends %s-game losing run', v_player_name, v_prev_streak),
            jsonb_build_object('player', v_player_name, 'ended_streak', v_prev_streak),
            ARRAY[v_p1]
          );
        END IF;
      END;
    END LOOP;
  END IF;

  -- Personal losing streaks continuing
  IF v_losers IS NOT NULL AND array_length(v_losers, 1) > 0 THEN
    FOREACH v_p1 IN ARRAY v_losers LOOP
      DECLARE
        v_streak INTEGER := 0;
        v_player_name TEXT;
      BEGIN
        SELECT friendly_name INTO v_player_name FROM players WHERE id = v_p1;

        -- Count consecutive losses INCLUDING this game
        WITH ordered_games AS (
          SELECT
            g.id,
            CASE WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR
                      (gr.team = 'orange' AND g.outcome = 'orange_win') THEN 'win'
                 WHEN g.outcome = 'draw' THEN 'draw'
                 ELSE 'loss' END as result,
            ROW_NUMBER() OVER (ORDER BY g.date DESC) as rn
          FROM game_registrations gr
          JOIN games g ON gr.game_id = g.id
          WHERE gr.player_id = v_p1 AND gr.status = 'selected' AND g.completed = true
          ORDER BY g.date DESC
        ),
        first_non_loss AS (
          SELECT MIN(rn) as first_break FROM ordered_games WHERE result != 'loss'
        )
        SELECT COALESCE(
          (SELECT first_break - 1 FROM first_non_loss WHERE first_break IS NOT NULL),
          (SELECT COUNT(*) FROM ordered_games)
        ) INTO v_streak;

        IF v_streak >= 5 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (
            p_game_id, 'losing_streak', 3,
            format('Tough times: %s has now lost %s in a row', v_player_name, v_streak),
            jsonb_build_object('player', v_player_name, 'streak', v_streak),
            ARRAY[v_p1]
          );
        END IF;
      END;
    END LOOP;
  END IF;

  -- =========================================================================
  -- TEAM WIN STREAK INSIGHTS
  -- =========================================================================
  IF p_game.outcome IN ('blue_win', 'orange_win') THEN
    DECLARE
      v_winning_team TEXT := CASE WHEN p_game.outcome = 'blue_win' THEN 'blue' ELSE 'orange' END;
      v_team_streak INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_team_streak
      FROM (
        SELECT outcome, ROW_NUMBER() OVER (ORDER BY date DESC) as rn
        FROM games WHERE completed = true AND outcome IS NOT NULL
        ORDER BY date DESC
      ) recent
      WHERE outcome = p_game.outcome AND rn <= (
        SELECT COALESCE(MIN(rn) - 1, (SELECT COUNT(*) FROM games WHERE completed = true AND outcome IS NOT NULL))
        FROM (
          SELECT outcome, ROW_NUMBER() OVER (ORDER BY date DESC) as rn
          FROM games WHERE completed = true AND outcome IS NOT NULL
        ) sub WHERE outcome != p_game.outcome
      );

      IF v_team_streak >= 3 THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'team_winning_streak', 3,
          format('%s team has won %s games in a row!', initcap(v_winning_team), v_team_streak),
          jsonb_build_object('team', v_winning_team, 'streak', v_team_streak),
          v_winners
        );
      END IF;
    END;
  END IF;

  -- =========================================================================
  -- RIVALRY INSIGHTS: NEVER BEATEN
  -- =========================================================================
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

          -- NEVER BEATEN: 0 wins, 5+ total games
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

          -- =========================================================================
          -- RIVALRY ONGOING DROUGHT - FIXED VERSION
          -- Count actual consecutive losses, not total losses
          -- =========================================================================
          IF v_losses_total >= 5 THEN
            DECLARE
              v_consecutive_losses INTEGER := 0;
            BEGIN
              -- Properly count consecutive losses from most recent game
              WITH ordered_h2h AS (
                SELECT
                  g.sequence_number,
                  CASE
                    WHEN (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
                         (gr1.team = 'orange' AND g.outcome = 'orange_win') THEN 'win'
                    WHEN g.outcome = 'draw' THEN 'draw'
                    ELSE 'loss'
                  END as result,
                  ROW_NUMBER() OVER (ORDER BY g.date DESC) as rn
                FROM game_registrations gr1
                JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
                JOIN games g ON gr1.game_id = g.id
                WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
                  AND gr1.status = 'selected' AND gr2.status = 'selected'
                  AND g.completed = true
                ORDER BY g.date DESC
              ),
              first_non_loss AS (
                SELECT MIN(rn) as first_break FROM ordered_h2h WHERE result != 'loss'
              )
              SELECT COALESCE(
                (SELECT first_break - 1 FROM first_non_loss WHERE first_break IS NOT NULL),
                (SELECT COUNT(*) FROM ordered_h2h)
              ) INTO v_consecutive_losses;

              -- Only show if 5+ consecutive losses AND they have won before (not 'never beaten')
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

  -- =========================================================================
  -- RIVALRY INSIGHTS: NEMESIS, CLOSE, REVENGE
  -- =========================================================================
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

          IF v_total >= 10 THEN
            -- NEMESIS: Dominant head-to-head (3+ more wins)
            IF v_wins >= v_losses + 3 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'rivalry_nemesis', 2,
                format('Nemesis! %s dominates %s (%s-%s-%s)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses),
                jsonb_build_object('winner', v_winner_name, 'loser', v_loser_name,
                  'record', format('%s-%s-%s', v_wins, v_draws, v_losses)),
                ARRAY[v_p1, v_p2]
              );
            END IF;

            -- CLOSE RIVALRY: Within 1 game
            IF ABS(v_wins - v_losses) <= 1 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'rivalry_close', 4,
                format('What a rivalry! %s vs %s is neck and neck (%s-%s-%s)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses),
                jsonb_build_object('player1', v_winner_name, 'player2', v_loser_name,
                  'record', format('%s-%s-%s', v_wins, v_draws, v_losses)),
                ARRAY[v_p1, v_p2]
              );
            END IF;
          END IF;

          -- REVENGE: Ended a losing streak vs opponent (fixed consecutive calculation)
          WITH ordered_h2h AS (
            SELECT
              CASE
                WHEN (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
                     (gr1.team = 'orange' AND g.outcome = 'orange_win') THEN 'win'
                WHEN g.outcome = 'draw' THEN 'draw'
                ELSE 'loss'
              END as result,
              ROW_NUMBER() OVER (ORDER BY g.date DESC) as rn
            FROM game_registrations gr1
            JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
            JOIN games g ON gr1.game_id = g.id
            WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
              AND gr1.status = 'selected' AND gr2.status = 'selected'
              AND g.completed = true AND g.date < p_game.date
            ORDER BY g.date DESC
          ),
          first_non_loss AS (
            SELECT MIN(rn) as first_break FROM ordered_h2h WHERE result != 'loss'
          )
          SELECT COALESCE(
            (SELECT first_break - 1 FROM first_non_loss WHERE first_break IS NOT NULL),
            (SELECT COUNT(*) FROM ordered_h2h)
          ) INTO v_consecutive_losses_before;

          IF v_consecutive_losses_before >= 3 THEN
            INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
            VALUES (
              p_game_id, 'rivalry_revenge', 2,
              format('Revenge! %s beats %s after %s straight losses', v_winner_name, v_loser_name, v_consecutive_losses_before),
              jsonb_build_object('winner', v_winner_name, 'loser', v_loser_name, 'ended_streak', v_consecutive_losses_before),
              ARRAY[v_p1, v_p2]
            );
          END IF;

          -- FIRST WIN NEMESIS: First ever win after 5+ losses
          DECLARE
            v_wins_before INTEGER;
            v_losses_before INTEGER;
            v_draws_before INTEGER;
          BEGIN
            SELECT
              COUNT(*) FILTER (WHERE
                (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
                (gr1.team = 'orange' AND g.outcome = 'orange_win')
              ),
              COUNT(*) FILTER (WHERE
                (gr1.team = 'blue' AND g.outcome = 'orange_win') OR
                (gr1.team = 'orange' AND g.outcome = 'blue_win')
              ),
              COUNT(*) FILTER (WHERE g.outcome = 'draw')
            INTO v_wins_before, v_losses_before, v_draws_before
            FROM game_registrations gr1
            JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
            JOIN games g ON gr1.game_id = g.id
            WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
              AND gr1.status = 'selected' AND gr2.status = 'selected'
              AND g.completed = true AND g.date < p_game.date;

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
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- =========================================================================
  -- FIRST WIN RIVALRY (from loser perspective who won)
  -- =========================================================================
  IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
    FOREACH v_p1 IN ARRAY v_winners LOOP
      FOREACH v_p2 IN ARRAY v_losers LOOP
        DECLARE
          v_wins_before INTEGER;
          v_losses_before INTEGER;
          v_draws_before INTEGER;
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
            COUNT(*) FILTER (WHERE g.outcome = 'draw')
          INTO v_wins_before, v_losses_before, v_draws_before
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
            AND gr1.status = 'selected' AND gr2.status = 'selected'
            AND g.completed = true AND g.date < p_game.date;

          -- First win (but less dramatic - had some losses)
          IF v_wins_before = 0 AND v_losses_before >= 2 AND v_losses_before < 5 THEN
            INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
            VALUES (
              p_game_id, 'rivalry_first_win', 2,
              format('First win! %s beat %s for the first time (was 0-%s-%s)',
                v_winner_name, v_loser_name, v_draws_before, v_losses_before),
              jsonb_build_object('winner', v_winner_name, 'loser', v_loser_name,
                'previous_record', format('0-%s-%s', v_draws_before, v_losses_before)),
              ARRAY[v_p1, v_p2]
            );
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- =========================================================================
  -- CHEMISTRY INSIGHTS (Duos)
  -- =========================================================================
  IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 1 THEN
    FOR i IN 1..array_length(v_winners, 1) LOOP
      FOR j IN (i+1)..array_length(v_winners, 1) LOOP
        v_p1 := v_winners[i];
        v_p2 := v_winners[j];

        DECLARE
          v_together_wins INTEGER;
          v_together_total INTEGER;
          v_p1_name TEXT;
          v_p2_name TEXT;
        BEGIN
          SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
          SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;

          SELECT
            COUNT(*) FILTER (WHERE
              (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
              (gr1.team = 'orange' AND g.outcome = 'orange_win')
            ),
            COUNT(*)
          INTO v_together_wins, v_together_total
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
            AND gr1.status = 'selected' AND gr2.status = 'selected'
            AND g.completed = true;

          IF v_together_total >= 5 AND v_together_wins::float / v_together_total >= 0.7 THEN
            INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
            VALUES (
              p_game_id, 'chemistry_duo', 3,
              format('Dynamic duo! %s & %s win together (%s/%s = %s%%)',
                v_p1_name, v_p2_name, v_together_wins, v_together_total,
                ROUND(v_together_wins::numeric / v_together_total * 100)),
              jsonb_build_object('player1', v_p1_name, 'player2', v_p2_name,
                'wins', v_together_wins, 'total', v_together_total,
                'win_rate', ROUND(v_together_wins::numeric / v_together_total * 100)),
              ARRAY[v_p1, v_p2]
            );
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- =========================================================================
  -- TRIO CHEMISTRY
  -- =========================================================================
  IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 2 THEN
    FOR i IN 1..array_length(v_winners, 1) LOOP
      FOR j IN (i+1)..array_length(v_winners, 1) LOOP
        FOR k IN (j+1)..array_length(v_winners, 1) LOOP
          v_p1 := v_winners[i];
          v_p2 := v_winners[j];
          v_p3 := v_winners[k];

          DECLARE
            v_trio_wins INTEGER;
            v_trio_total INTEGER;
            v_p1_name TEXT;
            v_p2_name TEXT;
            v_p3_name TEXT;
          BEGIN
            SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
            SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
            SELECT friendly_name INTO v_p3_name FROM players WHERE id = v_p3;

            SELECT
              COUNT(*) FILTER (WHERE
                (gr1.team = 'blue' AND g.outcome = 'blue_win') OR
                (gr1.team = 'orange' AND g.outcome = 'orange_win')
              ),
              COUNT(*)
            INTO v_trio_wins, v_trio_total
            FROM game_registrations gr1
            JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
            JOIN game_registrations gr3 ON gr1.game_id = gr3.game_id AND gr1.team = gr3.team
            JOIN games g ON gr1.game_id = g.id
            WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2 AND gr3.player_id = v_p3
              AND gr1.status = 'selected' AND gr2.status = 'selected' AND gr3.status = 'selected'
              AND g.completed = true;

            IF v_trio_total >= 5 AND v_trio_wins::float / v_trio_total >= 0.75 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'chemistry_trio', 2,
                format('Dream team! %s, %s & %s are unstoppable (%s/%s = %s%%)',
                  v_p1_name, v_p2_name, v_p3_name, v_trio_wins, v_trio_total,
                  ROUND(v_trio_wins::numeric / v_trio_total * 100)),
                jsonb_build_object('player1', v_p1_name, 'player2', v_p2_name, 'player3', v_p3_name,
                  'wins', v_trio_wins, 'total', v_trio_total,
                  'win_rate', ROUND(v_trio_wins::numeric / v_trio_total * 100)),
                ARRAY[v_p1, v_p2, v_p3]
              );
            END IF;
          END;
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;

  -- Return all insights that were generated
  RETURN QUERY
  SELECT pma.analysis_type, pma.priority, pma.headline, pma.details, pma.player_ids
  FROM post_match_analysis pma
  WHERE pma.game_id = p_game_id;

END;
$$;

-- =========================================================================
-- STEP 3: Add comment explaining the fix
-- =========================================================================
COMMENT ON FUNCTION generate_game_insights_on_demand(UUID) IS
'Generates post-match insights for a game. Fixed in 20260117 to correctly calculate
consecutive losses for rivalry_ongoing_drought (was counting total losses instead).';
