-- =====================================================
-- Fix: Suppress partnership_first insights for debuting players
-- =====================================================
-- Issue: When a player makes their WNF debut, they get:
--   1. debut_appearance (priority 1) - "Blake makes his WNF debut!"
--   2. partnership_first (priority 3) for EVERY teammate
--
-- This is redundant because a debut inherently means all partnerships
-- are first-time. The partnership_first insight adds no information
-- value when one of the players is debuting.
--
-- Fix: Skip partnership_first if either player has a debut_appearance
-- insight already generated for this game.
--
-- Pattern follows existing precedent:
--   - return_after_absence is not generated for players who get first_game_back_win
--   - See: _generate_appearance_insights duplicate prevention (Jan 2026)
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
  v_debuting_players UUID[];
BEGIN
  -- Get list of players making their debut (for partnership_first suppression)
  SELECT array_agg(player_ids[1]) INTO v_debuting_players
  FROM post_match_analysis
  WHERE game_id = p_game_id
    AND analysis_type = 'debut_appearance';

  -- Default to empty array if no debuts
  v_debuting_players := COALESCE(v_debuting_players, '{}'::UUID[]);

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
            -- Skip partnership_first if either player is making their debut
            -- (debut inherently means all partnerships are first-time)
            IF NOT (v_p1 = ANY(v_debuting_players) OR v_p2 = ANY(v_debuting_players)) THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'partnership_first', 3,
                format('First time: %s & %s played together', v_p1_name, v_p2_name),
                jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name]),
                ARRAY[v_p1, v_p2]
              );
            END IF;
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
            -- Skip partnership_first if either player is making their debut
            -- (debut inherently means all partnerships are first-time)
            IF NOT (v_p1 = ANY(v_debuting_players) OR v_p2 = ANY(v_debuting_players)) THEN
              INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
              VALUES (
                p_game_id, 'partnership_first', 3,
                format('First time: %s & %s played together', v_p1_name, v_p2_name),
                jsonb_build_object('players', ARRAY[v_p1_name, v_p2_name]),
                ARRAY[v_p1, v_p2]
              );
            END IF;
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

COMMENT ON FUNCTION _generate_milestone_insights IS
'Helper: generates cap and partnership milestone insights.

Suppression Rules (Jan 2026):
- partnership_first is NOT generated if either player has a debut_appearance
- This follows the pattern of return_after_absence being skipped for first_game_back_win
- Debut inherently means all partnerships are first-time, so partnership_first is redundant';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- - Added v_debuting_players array populated from debut_appearance insights
-- - Added check before partnership_first insert to skip if either player is debuting
-- - Updated function comment to document the suppression rule
--
-- Test Cases:
-- 1. New player debut with 9 teammates -> 1 debut_appearance, 0 partnership_first
-- 2. Two new players debut together -> 2 debut_appearance, 0 partnership_first for any pair involving either
-- 3. Existing players first time together -> partnership_first still generated (neither debuting)
-- =====================================================
