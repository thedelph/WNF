-- Update WhatsApp summary to show a variety of insight types
-- Instead of just top 5 by priority (which can be all partnership milestones),
-- pick one from each category first for variety

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

  -- Get varied insights: one from each category, then fill remaining slots
  -- Categories: trophy, rivalry, partnership, cap, streak, game_record
  -- Use DISTINCT ON to get best (lowest priority) from each category
  FOR v_insight IN
    WITH categorized AS (
      SELECT
        id,
        headline,
        analysis_type,
        priority,
        created_at,
        CASE
          WHEN analysis_type LIKE 'trophy%' THEN 'trophy'
          WHEN analysis_type LIKE 'rivalry%' THEN 'rivalry'
          WHEN analysis_type LIKE 'partnership%' THEN 'partnership'
          WHEN analysis_type = 'cap_milestone' THEN 'cap'
          WHEN analysis_type LIKE 'streak%' OR analysis_type = 'team_streak' THEN 'streak'
          WHEN analysis_type = 'game_record' THEN 'record'
          ELSE 'other'
        END as category
      FROM post_match_analysis
      WHERE game_id = p_game_id
    ),
    -- Get best insight from each category
    best_per_category AS (
      SELECT DISTINCT ON (category)
        id, headline, analysis_type, priority, created_at, category
      FROM categorized
      ORDER BY category, priority, created_at
    ),
    -- Get all insights ranked
    all_ranked AS (
      SELECT
        id, headline, analysis_type, priority, created_at, category,
        ROW_NUMBER() OVER (ORDER BY priority, created_at) as overall_rank
      FROM categorized
    ),
    -- Combine: category bests first, then fill with others not already included
    combined AS (
      -- First: best from each category (ensures variety)
      SELECT headline, priority, 1 as selection_tier, created_at
      FROM best_per_category

      UNION ALL

      -- Then: remaining high-priority insights not already selected
      SELECT a.headline, a.priority, 2 as selection_tier, a.created_at
      FROM all_ranked a
      WHERE NOT EXISTS (
        SELECT 1 FROM best_per_category b WHERE b.id = a.id
      )
      AND a.overall_rank <= 20  -- Only consider top 20 overall
    )
    SELECT headline
    FROM combined
    ORDER BY selection_tier, priority, created_at
    LIMIT v_max_insights
  LOOP
    v_count := v_count + 1;
    v_summary := v_summary || format(E'\n%s. %s', v_count, v_insight.headline);
  END LOOP;

  IF v_count = 0 THEN
    v_summary := v_summary || E'\nNo notable changes this week.';
  END IF;

  RETURN v_summary;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_whatsapp_summary(UUID) IS
'Generates a WhatsApp-friendly summary of post-match analysis.
Selects a variety of insight types (one from each category first)
rather than just top N by priority to ensure diverse content.';
