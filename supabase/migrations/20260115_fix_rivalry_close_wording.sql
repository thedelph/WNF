-- Fix rivalry_close insight wording
-- Bug: The "edges ahead" text was used regardless of who was actually leading the H2H record
-- Fix: Use appropriate wording based on the actual W/L state:
--   - Winner of this game is ahead overall -> "extends lead"
--   - Winner of this game is behind overall -> "closes gap"
--   - Tied overall -> "levels the series"

-- First, update the function with correct logic
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
  v_winning_players UUID[];
  v_losing_players UUID[];
  v_p1 UUID;
  v_p2 UUID;
  v_p3 UUID;
  v_player RECORD;
  v_caps_before INTEGER;
  v_caps_after INTEGER;
  v_games_together_after INTEGER;
  v_cap_milestone INTEGER;
  v_team_streak INTEGER;
  v_streaks_before RECORD;
  v_chemistry RECORD;
  v_trio_stats RECORD;
  v_trophy RECORD;
  v_dynamic_priority INT;
  v_category_title TEXT;
  v_winless_before INTEGER;
  v_formatted_value TEXT;
BEGIN
  -- Get game details
  SELECT g.*, g.sequence_number INTO v_game
  FROM games g WHERE g.id = p_game_id;

  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found: %', p_game_id;
  END IF;

  -- Get previous game for trophy comparison
  SELECT id INTO v_prev_game
  FROM games
  WHERE completed = true
    AND sequence_number < v_game.sequence_number
  ORDER BY sequence_number DESC
  LIMIT 1;

  -- Delete any existing analysis for this game
  DELETE FROM post_match_analysis WHERE post_match_analysis.game_id = p_game_id;

  -- Get players by team
  SELECT array_agg(gr.player_id) INTO v_blue_players
  FROM game_registrations gr
  WHERE gr.game_id = p_game_id AND gr.team = 'blue' AND gr.status = 'selected';

  SELECT array_agg(gr.player_id) INTO v_orange_players
  FROM game_registrations gr
  WHERE gr.game_id = p_game_id AND gr.team = 'orange' AND gr.status = 'selected';

  -- Determine winners and losers
  IF v_game.outcome = 'blue_win' THEN
    v_winning_players := v_blue_players;
    v_losing_players := v_orange_players;
  ELSIF v_game.outcome = 'orange_win' THEN
    v_winning_players := v_orange_players;
    v_losing_players := v_blue_players;
  END IF;

  -- =========================================================================
  -- TROPHY CHANGES
  -- =========================================================================
  IF v_prev_game.id IS NOT NULL THEN
    FOR v_trophy IN
      SELECT
        curr.category, curr.player_id, curr.player_name, curr.value,
        curr.medal_position, curr.partner_id, curr.partner_name,
        prev.player_name as old_holder_name
      FROM award_snapshots curr
      LEFT JOIN award_snapshots prev ON
        prev.game_id = v_prev_game.id
        AND prev.category = curr.category
        AND prev.medal_position = curr.medal_position
        AND prev.snapshot_type = 'after'
      WHERE curr.game_id = p_game_id
        AND curr.snapshot_type = 'after'
        AND curr.medal_position IS NOT NULL
        AND (prev.player_id IS NULL OR prev.player_id != curr.player_id)
    LOOP
      PERFORM 1 FROM award_snapshots
      WHERE game_id = v_prev_game.id
        AND category = v_trophy.category
        AND player_id = v_trophy.player_id
        AND medal_position < v_trophy.medal_position
        AND snapshot_type = 'after';

      IF FOUND THEN CONTINUE; END IF;

      v_category_title := CASE v_trophy.category
        WHEN 'appearance_king' THEN 'Appearances'
        WHEN 'win_rate_leader' THEN 'Win Rate'
        WHEN 'iron_man' THEN 'Iron Man'
        WHEN 'dynamic_duo' THEN 'Dynamic Duo'
        WHEN 'hot_streak' THEN 'Hot Streak'
        WHEN 'the_wall' THEN 'The Wall'
        ELSE v_trophy.category
      END;

      v_dynamic_priority := CASE v_trophy.medal_position
        WHEN 1 THEN CASE WHEN v_trophy.old_holder_name IS NOT NULL THEN 1 ELSE 2 END
        WHEN 2 THEN CASE WHEN v_trophy.old_holder_name IS NOT NULL THEN 2 ELSE 3 END
        WHEN 3 THEN CASE WHEN v_trophy.old_holder_name IS NOT NULL THEN 3 ELSE 4 END
      END;

      -- Format value: percentages get 1 decimal, counts are integers
      v_formatted_value := CASE
        WHEN v_trophy.category IN ('win_rate_leader', 'dynamic_duo') THEN
          ROUND(v_trophy.value::numeric, 1)::text || '%'
        ELSE
          ROUND(v_trophy.value::numeric, 0)::int::text
      END;

      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (
        p_game_id, 'trophy_change', v_dynamic_priority,
        CASE v_trophy.medal_position WHEN 1 THEN '🥇 ' WHEN 2 THEN '🥈 ' WHEN 3 THEN '🥉 ' END ||
        v_category_title || ': ' ||
        CASE WHEN v_trophy.partner_name IS NOT NULL
          THEN v_trophy.player_name || ' & ' || v_trophy.partner_name
          ELSE v_trophy.player_name
        END ||
        CASE WHEN v_trophy.old_holder_name IS NOT NULL
          THEN ' takes ' || CASE v_trophy.medal_position WHEN 1 THEN 'gold' WHEN 2 THEN 'silver' ELSE 'bronze' END || ' from ' || v_trophy.old_holder_name
          ELSE ' takes ' || CASE v_trophy.medal_position WHEN 1 THEN 'gold' WHEN 2 THEN 'silver' ELSE 'bronze' END
        END ||
        ' (' || v_formatted_value || ')',
        jsonb_build_object('category', v_trophy.category, 'medal_position', v_trophy.medal_position, 'value', v_trophy.value, 'old_holder', v_trophy.old_holder_name),
        CASE WHEN v_trophy.partner_id IS NOT NULL THEN ARRAY[v_trophy.player_id, v_trophy.partner_id] ELSE ARRAY[v_trophy.player_id] END
      );
    END LOOP;
  END IF;

  -- =========================================================================
  -- INDIVIDUAL STREAKS
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name FROM players p
    WHERE p.id = ANY(COALESCE(v_blue_players, '{}'::UUID[]) || COALESCE(v_orange_players, '{}'::UUID[]))
  LOOP
    SELECT * INTO v_streaks_before FROM calculate_player_streaks_before_game(v_player.id, v_game.date);

    DECLARE
      v_this_result TEXT;
      v_player_team TEXT;
    BEGIN
      SELECT gr.team INTO v_player_team FROM game_registrations gr WHERE gr.game_id = p_game_id AND gr.player_id = v_player.id;

      IF (v_player_team = 'blue' AND v_game.outcome = 'blue_win') OR (v_player_team = 'orange' AND v_game.outcome = 'orange_win') THEN
        v_this_result := 'win';
      ELSIF v_game.outcome = 'draw' THEN
        v_this_result := 'draw';
      ELSE
        v_this_result := 'loss';
      END IF;

      IF v_this_result = 'win' THEN
        IF v_streaks_before.win_streak >= 2 THEN
          v_dynamic_priority := GREATEST(1, 4 - ((v_streaks_before.win_streak + 1) / 2));
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (p_game_id, 'win_streak', v_dynamic_priority,
            format('On fire! %s wins %s in a row', v_player.friendly_name, v_streaks_before.win_streak + 1),
            jsonb_build_object('streak', v_streaks_before.win_streak + 1), ARRAY[v_player.id]);
        END IF;

        IF v_streaks_before.losing_streak >= 3 THEN
          v_dynamic_priority := GREATEST(1, 3 - (v_streaks_before.losing_streak / 3));
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (p_game_id, 'losing_streak_ended', v_dynamic_priority,
            format('Finally! %s ends %s-game losing run', v_player.friendly_name, v_streaks_before.losing_streak),
            jsonb_build_object('ended_streak', v_streaks_before.losing_streak), ARRAY[v_player.id]);
        END IF;

        v_winless_before := 0;
        FOR v_streaks_before IN
          SELECT CASE WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR (gr.team = 'orange' AND g.outcome = 'orange_win') THEN 'win' ELSE 'not_win' END as result
          FROM game_registrations gr JOIN games g ON gr.game_id = g.id
          WHERE gr.player_id = v_player.id AND gr.status = 'selected' AND g.completed = true AND g.date < v_game.date
          ORDER BY g.date DESC LIMIT 20
        LOOP
          IF v_streaks_before.result = 'win' THEN EXIT; ELSE v_winless_before := v_winless_before + 1; END IF;
        END LOOP;

        IF v_winless_before >= 5 THEN
          v_dynamic_priority := GREATEST(1, 3 - (v_winless_before / 3));
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (p_game_id, 'winless_streak_ended', v_dynamic_priority,
            format('Drought over! %s wins after %s winless games', v_player.friendly_name, v_winless_before),
            jsonb_build_object('ended_streak', v_winless_before), ARRAY[v_player.id]);
        END IF;
      END IF;

      IF v_this_result = 'loss' THEN
        SELECT * INTO v_streaks_before FROM calculate_player_streaks_before_game(v_player.id, v_game.date);
        IF v_streaks_before.win_streak >= 3 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (p_game_id, 'win_streak_ended', 4,
            format('Streak ended: %s''s %s-game win streak broken', v_player.friendly_name, v_streaks_before.win_streak),
            jsonb_build_object('ended_streak', v_streaks_before.win_streak), ARRAY[v_player.id]);
        END IF;

        IF v_streaks_before.losing_streak >= 3 THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (p_game_id, 'losing_streak', 5,
            format('Struggling: %s hasn''t won in %s games', v_player.friendly_name, v_streaks_before.losing_streak + 1),
            jsonb_build_object('streak', v_streaks_before.losing_streak + 1), ARRAY[v_player.id]);
        END IF;
      END IF;

      SELECT * INTO v_streaks_before FROM calculate_player_streaks_before_game(v_player.id, v_game.date);
      IF v_this_result IN ('win', 'draw') AND v_streaks_before.unbeaten_streak >= 4 THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (p_game_id, 'unbeaten_streak', 3,
          format('Unbeaten in %s! %s extends run', v_streaks_before.unbeaten_streak + 1, v_player.friendly_name),
          jsonb_build_object('streak', v_streaks_before.unbeaten_streak + 1), ARRAY[v_player.id]);
      END IF;
    END;
  END LOOP;

  -- =========================================================================
  -- DUO CHEMISTRY (with W-D-L stats) - EVENT DRIVEN
  -- =========================================================================
  IF v_winning_players IS NOT NULL AND array_length(v_winning_players, 1) >= 2 THEN
    FOR i IN 1..array_length(v_winning_players, 1)-1 LOOP
      FOR j IN i+1..array_length(v_winning_players, 1) LOOP
        v_p1 := v_winning_players[i];
        v_p2 := v_winning_players[j];

        DECLARE
          v_games INT; v_wins INT; v_draws INT; v_losses INT;
          v_points_pct NUMERIC; v_p1_name TEXT; v_p2_name TEXT;
        BEGIN
          SELECT COUNT(*),
            COUNT(*) FILTER (WHERE (gr1.team = 'blue' AND g.outcome = 'blue_win') OR (gr1.team = 'orange' AND g.outcome = 'orange_win')),
            COUNT(*) FILTER (WHERE g.outcome = 'draw')
          INTO v_games, v_wins, v_draws
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
            AND gr1.status = 'selected' AND gr2.status = 'selected' AND g.completed = true;

          v_losses := v_games - v_wins - v_draws;

          IF v_games >= 10 THEN
            SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
            SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
            v_points_pct := ROUND(((v_wins * 3 + v_draws * 1)::NUMERIC / (v_games * 3)) * 100, 0);

            IF v_points_pct >= 60 THEN
              v_dynamic_priority := GREATEST(2, 5 - ((v_points_pct - 55) / 8)::int - (v_games / 15)::int);
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (p_game_id, 'chemistry_kings', v_dynamic_priority,
                format('%s & %s win again together (now %sW-%sD-%sL, %s%%)', v_p1_name, v_p2_name, v_wins, v_draws, v_losses, v_points_pct),
                jsonb_build_object('games', v_games, 'points_pct', v_points_pct, 'wins', v_wins, 'draws', v_draws, 'losses', v_losses),
                ARRAY[v_p1, v_p2]);
            END IF;

            IF v_wins IN (10, 20, 30, 40, 50) THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (p_game_id, 'chemistry_milestone', 4,
                format('%s wins together! %s & %s', v_wins, v_p1_name, v_p2_name),
                jsonb_build_object('wins', v_wins), ARRAY[v_p1, v_p2]);
            END IF;
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- Chemistry curse (priority 5, with W-D-L)
  IF v_losing_players IS NOT NULL AND array_length(v_losing_players, 1) >= 2 THEN
    FOR i IN 1..array_length(v_losing_players, 1)-1 LOOP
      FOR j IN i+1..array_length(v_losing_players, 1) LOOP
        v_p1 := v_losing_players[i];
        v_p2 := v_losing_players[j];

        DECLARE
          v_games INT; v_wins INT; v_draws INT; v_losses INT;
          v_points_pct NUMERIC; v_p1_name TEXT; v_p2_name TEXT;
        BEGIN
          SELECT COUNT(*),
            COUNT(*) FILTER (WHERE (gr1.team = 'blue' AND g.outcome = 'blue_win') OR (gr1.team = 'orange' AND g.outcome = 'orange_win')),
            COUNT(*) FILTER (WHERE g.outcome = 'draw')
          INTO v_games, v_wins, v_draws
          FROM game_registrations gr1
          JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
          JOIN games g ON gr1.game_id = g.id
          WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2
            AND gr1.status = 'selected' AND gr2.status = 'selected' AND g.completed = true;

          v_losses := v_games - v_wins - v_draws;

          IF v_games >= 10 THEN
            SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
            SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
            v_points_pct := ROUND(((v_wins * 3 + v_draws * 1)::NUMERIC / (v_games * 3)) * 100, 0);

            IF v_points_pct <= 35 THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (p_game_id, 'chemistry_curse', 5,
                format('%s & %s lose together again (%sW-%sD-%sL, %s%%)', v_p1_name, v_p2_name, v_wins, v_draws, v_losses, v_points_pct),
                jsonb_build_object('games', v_games, 'points_pct', v_points_pct, 'wins', v_wins, 'draws', v_draws, 'losses', v_losses),
                ARRAY[v_p1, v_p2]);
            END IF;
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- =========================================================================
  -- TRIO CHEMISTRY (with W-D-L stats) - EVENT DRIVEN
  -- =========================================================================
  IF v_winning_players IS NOT NULL AND array_length(v_winning_players, 1) >= 3 THEN
    FOR i IN 1..array_length(v_winning_players, 1)-2 LOOP
      FOR j IN i+1..array_length(v_winning_players, 1)-1 LOOP
        FOR k IN j+1..array_length(v_winning_players, 1) LOOP
          v_p1 := v_winning_players[i];
          v_p2 := v_winning_players[j];
          v_p3 := v_winning_players[k];

          DECLARE
            v_games INT; v_wins INT; v_draws INT; v_losses INT;
            v_points_pct NUMERIC; v_p1_name TEXT; v_p2_name TEXT; v_p3_name TEXT;
          BEGIN
            SELECT COUNT(*),
              COUNT(*) FILTER (WHERE (gr1.team = 'blue' AND g.outcome = 'blue_win') OR (gr1.team = 'orange' AND g.outcome = 'orange_win')),
              COUNT(*) FILTER (WHERE g.outcome = 'draw')
            INTO v_games, v_wins, v_draws
            FROM game_registrations gr1
            JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
            JOIN game_registrations gr3 ON gr1.game_id = gr3.game_id AND gr1.team = gr3.team
            JOIN games g ON gr1.game_id = g.id
            WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2 AND gr3.player_id = v_p3
              AND gr1.status = 'selected' AND gr2.status = 'selected' AND gr3.status = 'selected' AND g.completed = true;

            v_losses := v_games - v_wins - v_draws;

            IF v_games >= 5 THEN
              SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
              SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
              SELECT friendly_name INTO v_p3_name FROM players WHERE id = v_p3;
              v_points_pct := ROUND(((v_wins * 3 + v_draws * 1)::NUMERIC / (v_games * 3)) * 100, 0);

              IF v_points_pct >= 65 THEN
                v_dynamic_priority := GREATEST(2, 5 - ((v_points_pct - 60) / 8)::int - (v_games / 10)::int);
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (p_game_id, 'trio_dream_team', v_dynamic_priority,
                  format('%s/%s/%s win again together (now %sW-%sD-%sL, %s%%)', v_p1_name, v_p2_name, v_p3_name, v_wins, v_draws, v_losses, v_points_pct),
                  jsonb_build_object('games', v_games, 'points_pct', v_points_pct, 'wins', v_wins, 'draws', v_draws, 'losses', v_losses),
                  ARRAY[v_p1, v_p2, v_p3]);
              END IF;
            END IF;
          END;
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;

  -- Cursed trio (priority 5, with W-D-L)
  IF v_losing_players IS NOT NULL AND array_length(v_losing_players, 1) >= 3 THEN
    FOR i IN 1..array_length(v_losing_players, 1)-2 LOOP
      FOR j IN i+1..array_length(v_losing_players, 1)-1 LOOP
        FOR k IN j+1..array_length(v_losing_players, 1) LOOP
          v_p1 := v_losing_players[i];
          v_p2 := v_losing_players[j];
          v_p3 := v_losing_players[k];

          DECLARE
            v_games INT; v_wins INT; v_draws INT; v_losses INT;
            v_points_pct NUMERIC; v_p1_name TEXT; v_p2_name TEXT; v_p3_name TEXT;
          BEGIN
            SELECT COUNT(*),
              COUNT(*) FILTER (WHERE (gr1.team = 'blue' AND g.outcome = 'blue_win') OR (gr1.team = 'orange' AND g.outcome = 'orange_win')),
              COUNT(*) FILTER (WHERE g.outcome = 'draw')
            INTO v_games, v_wins, v_draws
            FROM game_registrations gr1
            JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
            JOIN game_registrations gr3 ON gr1.game_id = gr3.game_id AND gr1.team = gr3.team
            JOIN games g ON gr1.game_id = g.id
            WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2 AND gr3.player_id = v_p3
              AND gr1.status = 'selected' AND gr2.status = 'selected' AND gr3.status = 'selected' AND g.completed = true;

            v_losses := v_games - v_wins - v_draws;

            IF v_games >= 5 THEN
              SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_p1;
              SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_p2;
              SELECT friendly_name INTO v_p3_name FROM players WHERE id = v_p3;
              v_points_pct := ROUND(((v_wins * 3 + v_draws * 1)::NUMERIC / (v_games * 3)) * 100, 0);

              IF v_points_pct <= 35 THEN
                INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                VALUES (p_game_id, 'trio_cursed', 5,
                  format('%s/%s/%s lose together again (%sW-%sD-%sL, %s%%)', v_p1_name, v_p2_name, v_p3_name, v_wins, v_draws, v_losses, v_points_pct),
                  jsonb_build_object('games', v_games, 'points_pct', v_points_pct, 'wins', v_wins, 'draws', v_draws, 'losses', v_losses),
                  ARRAY[v_p1, v_p2, v_p3]);
              END IF;
            END IF;
          END;
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;

  -- =========================================================================
  -- RIVALRY INSIGHTS - EVENT DRIVEN (FIXED: correct wording based on who's ahead)
  -- =========================================================================
  IF v_blue_players IS NOT NULL AND v_orange_players IS NOT NULL AND v_game.outcome IS NOT NULL AND v_game.outcome != 'draw' THEN
    DECLARE v_winners UUID[]; v_losers UUID[];
    BEGIN
      IF v_game.outcome = 'blue_win' THEN v_winners := v_blue_players; v_losers := v_orange_players;
      ELSE v_winners := v_orange_players; v_losers := v_blue_players; END IF;

      IF v_winners IS NOT NULL AND array_length(v_winners, 1) > 0 THEN
        FOREACH v_p1 IN ARRAY v_winners LOOP
          FOREACH v_p2 IN ARRAY v_losers LOOP
            DECLARE
              v_wins INTEGER; v_losses INTEGER; v_draws INTEGER; v_total INTEGER;
              v_winner_name TEXT; v_loser_name TEXT;
              v_headline TEXT;
            BEGIN
              SELECT friendly_name INTO v_winner_name FROM players WHERE id = v_p1;
              SELECT friendly_name INTO v_loser_name FROM players WHERE id = v_p2;

              SELECT
                COUNT(*) FILTER (WHERE (gr1.team = 'blue' AND g.outcome = 'blue_win') OR (gr1.team = 'orange' AND g.outcome = 'orange_win')),
                COUNT(*) FILTER (WHERE (gr1.team = 'blue' AND g.outcome = 'orange_win') OR (gr1.team = 'orange' AND g.outcome = 'blue_win')),
                COUNT(*) FILTER (WHERE g.outcome = 'draw'), COUNT(*)
              INTO v_wins, v_losses, v_draws, v_total
              FROM game_registrations gr1
              JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team != gr2.team
              JOIN games g ON gr1.game_id = g.id
              WHERE gr1.player_id = v_p1 AND gr2.player_id = v_p2 AND gr1.status = 'selected' AND gr2.status = 'selected' AND g.completed = true;

              IF v_total >= 5 THEN
                IF v_wins - v_losses >= 10 THEN
                  v_dynamic_priority := GREATEST(2, 4 - ((v_wins - v_losses) / 5));
                  -- Event-driven: "continues to dominate" or "begins to dominate"
                  IF v_wins - v_losses >= 15 THEN
                    v_headline := format('%s continues to dominate %s (%sW-%sD-%sL)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses);
                  ELSE
                    v_headline := format('%s begins to dominate %s (%sW-%sD-%sL)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses);
                  END IF;
                  INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                  VALUES (p_game_id, 'rivalry_nemesis', v_dynamic_priority, v_headline,
                    jsonb_build_object('record', format('%s-%s-%s', v_wins, v_draws, v_losses)), ARRAY[v_p1, v_p2]);
                ELSIF v_total >= 20 AND ABS(v_wins - v_losses) <= 3 THEN
                  v_dynamic_priority := GREATEST(2, 4 - (v_total / 15));
                  -- FIXED: Use appropriate wording based on who is actually ahead in the H2H
                  IF v_wins > v_losses THEN
                    -- Winner of this game is also ahead overall
                    v_headline := format('%s extends lead vs %s (%sW-%sD-%sL)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses);
                  ELSIF v_wins < v_losses THEN
                    -- Winner of this game is behind overall - they're closing the gap
                    v_headline := format('%s closes gap vs %s (%sW-%sD-%sL)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses);
                  ELSE
                    -- Exactly tied
                    v_headline := format('%s levels the series vs %s (%sW-%sD-%sL)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses);
                  END IF;
                  INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                  VALUES (p_game_id, 'rivalry_close', v_dynamic_priority, v_headline,
                    jsonb_build_object('record', format('%s-%s-%s', v_wins, v_draws, v_losses)), ARRAY[v_p1, v_p2]);
                ELSIF v_wins - v_losses >= 5 THEN
                  INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
                  VALUES (p_game_id, 'rivalry_dominant', 4,
                    format('%s extends lead over %s (%sW-%sD-%sL)', v_winner_name, v_loser_name, v_wins, v_draws, v_losses),
                    jsonb_build_object('record', format('%s-%s-%s', v_wins, v_draws, v_losses)), ARRAY[v_p1, v_p2]);
                END IF;
              END IF;
            END;
          END LOOP;
        END LOOP;
      END IF;
    END;
  END IF;

  -- =========================================================================
  -- MILESTONES
  -- =========================================================================
  FOR v_player IN
    SELECT p.id, p.friendly_name FROM players p
    WHERE p.id = ANY(COALESCE(v_blue_players, '{}'::UUID[]) || COALESCE(v_orange_players, '{}'::UUID[]))
  LOOP
    SELECT COUNT(*) INTO v_caps_before
    FROM game_registrations gr JOIN games g ON gr.game_id = g.id
    WHERE gr.player_id = v_player.id AND gr.status = 'selected' AND g.completed = true AND g.date < v_game.date;

    v_caps_after := v_caps_before + 1;

    FOR v_cap_milestone IN SELECT unnest(ARRAY[10, 25, 50, 75, 100, 150]) LOOP
      IF v_caps_after = v_cap_milestone THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (p_game_id, 'cap_milestone', 4,
          CASE v_cap_milestone
            WHEN 100 THEN format('Century club! %s plays their 100th game', v_player.friendly_name)
            WHEN 50 THEN format('Half century: %s reaches 50 caps', v_player.friendly_name)
            ELSE format('Milestone: %s reaches %s caps', v_player.friendly_name, v_cap_milestone)
          END,
          jsonb_build_object('caps', v_caps_after), ARRAY[v_player.id]);
        EXIT;
      END IF;
    END LOOP;
  END LOOP;

  -- Partnership milestones
  FOR v_player IN
    SELECT DISTINCT gr.player_id as p1, gr2.player_id as p2
    FROM game_registrations gr
    JOIN game_registrations gr2 ON gr.game_id = gr2.game_id AND gr.team = gr2.team AND gr.player_id < gr2.player_id
    WHERE gr.game_id = p_game_id AND gr.status = 'selected' AND gr2.status = 'selected'
  LOOP
    SELECT COUNT(*) INTO v_games_together_after
    FROM game_registrations gr1
    JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id AND gr1.team = gr2.team
    JOIN games g ON gr1.game_id = g.id
    WHERE gr1.player_id = v_player.p1 AND gr2.player_id = v_player.p2
      AND gr1.status = 'selected' AND gr2.status = 'selected' AND g.completed = true;

    DECLARE v_p1_name TEXT; v_p2_name TEXT;
    BEGIN
      SELECT friendly_name INTO v_p1_name FROM players WHERE id = v_player.p1;
      SELECT friendly_name INTO v_p2_name FROM players WHERE id = v_player.p2;

      FOR v_cap_milestone IN SELECT unnest(ARRAY[25, 50, 75, 100]) LOOP
        IF v_games_together_after = v_cap_milestone THEN
          INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
          VALUES (p_game_id, 'partnership_milestone', 4,
            format('%s games together! %s & %s', v_cap_milestone, v_p1_name, v_p2_name),
            jsonb_build_object('games', v_games_together_after), ARRAY[v_player.p1, v_player.p2]);
          EXIT;
        END IF;
      END LOOP;
    END;
  END LOOP;

  -- =========================================================================
  -- TEAM COLOR STREAKS (priority 6)
  -- =========================================================================
  IF v_game.outcome IN ('blue_win', 'orange_win') THEN
    SELECT COUNT(*) INTO v_team_streak
    FROM (SELECT outcome FROM games WHERE completed = true AND date <= v_game.date ORDER BY date DESC LIMIT 10) recent
    WHERE outcome = v_game.outcome;

    IF v_team_streak >= 5 THEN
      INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
      VALUES (p_game_id, 'team_streak', 6,
        format('%s won %s in a row!', CASE WHEN v_game.outcome = 'blue_win' THEN 'Blue' ELSE 'Orange' END, v_team_streak),
        jsonb_build_object('streak', v_team_streak), '{}'::UUID[]);
    END IF;
  END IF;

  -- =========================================================================
  -- GAME RECORDS
  -- =========================================================================
  IF COALESCE(v_game.score_blue, 0) + COALESCE(v_game.score_orange, 0) >= 15 THEN
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (p_game_id, 'game_record', 3,
      format('Goal fest! WNF #%s finished %s-%s', v_game.sequence_number, v_game.score_blue, v_game.score_orange),
      jsonb_build_object('total_goals', v_game.score_blue + v_game.score_orange), '{}'::UUID[]);
  END IF;

  IF ABS(COALESCE(v_game.score_blue, 0) - COALESCE(v_game.score_orange, 0)) = 1 THEN
    INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
    VALUES (p_game_id, 'game_record', 3,
      format('Nail-biter! WNF #%s decided by a single goal (%s-%s)', v_game.sequence_number, v_game.score_blue, v_game.score_orange),
      jsonb_build_object('margin', 1), '{}'::UUID[]);
  END IF;
END;
$$;

-- Now delete the incorrectly-worded rivalry_close insights that say "edges ahead"
-- These will be regenerated with correct wording when insights are regenerated
DELETE FROM post_match_analysis
WHERE analysis_type = 'rivalry_close'
  AND headline LIKE '%edges ahead%';

-- Add comment
COMMENT ON FUNCTION generate_game_insights_on_demand(UUID) IS
'Generates post-match insights for a game. Fixed Jan 2026: rivalry_close now uses correct wording based on who is actually ahead in the H2H record.';
