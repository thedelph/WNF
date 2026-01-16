-- Balanced WhatsApp summary: category variety + player variety + positive only
-- Combines category-based selection (type variety) with player deduplication
-- Excludes negative insight types from headlines

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
          'player_color_curse'
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
          'player_color_curse'
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

-- Add comment explaining the function
COMMENT ON FUNCTION get_whatsapp_summary(UUID) IS
'Generates a WhatsApp-friendly summary of post-match analysis.
Phase 1: Selects one insight from each category (ensuring type variety).
Phase 2: Fills remaining slots preferring insights with NEW player names.
Excludes negative insight types (cursed trios, losing streaks, etc.) from headlines.';
