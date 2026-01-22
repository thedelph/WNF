-- =====================================================
-- Fix: generate_game_insights_on_demand RECORD passing
-- =====================================================
-- Issue: The function was selecting "g.*, g.sequence_number" which created
-- a duplicate column. When this RECORD was passed to helper functions,
-- it caused issues with field access, resulting in debut_appearance and
-- attendance_streak insights not being generated.
--
-- Fix: Change "SELECT g.*, g.sequence_number" to "SELECT *"
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
  -- Get game details (FIX: removed duplicate sequence_number column)
  SELECT * INTO v_game
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
FIX (Jan 2026): Removed duplicate sequence_number column selection that was
causing issues when passing RECORD to helper functions.

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
