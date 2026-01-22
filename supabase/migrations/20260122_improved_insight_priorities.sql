-- =====================================================
-- Improved Post-Match Insights: Priorities, Categories, and Selection
-- =====================================================
-- This migration addresses several issues:
-- 1. Debut appearances should have highest priority (1) with neutral wording
-- 2. Attendance streak milestones should have dynamic priority based on magnitude
-- 3. WhatsApp summary should use more granular categories to avoid duplicates
-- 4. WhatsApp summary should prefer higher magnitude insights within categories
-- 5. WhatsApp summary should deduplicate players (spread headlines across more players)
-- 6. Add 5-game attendance streak milestone with lower priority
-- =====================================================

-- =====================================================
-- CHANGE 1: Update _generate_appearance_insights
-- - Debut priority 1 (highest) instead of 3
-- - Neutral headline (doesn't imply group membership)
-- - Fix timing issue: check current game even if not marked complete yet
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
      v_total_selected_games INTEGER;
    BEGIN
      -- Count total games this player has been selected for (including current)
      -- This avoids the timing issue with completed=true check
      SELECT COUNT(*) INTO v_total_selected_games
      FROM game_registrations gr
      JOIN games g ON gr.game_id = g.id
      WHERE gr.player_id = v_player.id
        AND gr.status = 'selected';

      -- If this is their only selected game, it's a debut
      IF v_total_selected_games = 1 THEN
        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'debut_appearance', 1,  -- Priority 1 (highest)
          format('🎉 %s makes his WNF debut!', v_player.friendly_name),
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

COMMENT ON FUNCTION _generate_appearance_insights IS 'Helper: generates debut (priority 1), return, comeback win, and bench warmer insights';

-- =====================================================
-- CHANGE 2: Update _generate_streak_insights
-- - Dynamic priority based on streak magnitude
-- - Add 5-game milestone with lower priority
-- - Priority scale: 50+=1, 30-49=2, 20-29=3, 10-19=4, 5-9=5
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
      v_streak_priority INTEGER;
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

      -- Check if this is a milestone: 5, 10, 20, 30, 40, 50
      IF v_current_streak IN (5, 10, 20, 30, 40, 50) THEN
        -- Dynamic priority based on streak magnitude
        v_streak_priority := CASE
          WHEN v_current_streak >= 50 THEN 1  -- Critical
          WHEN v_current_streak >= 30 THEN 2  -- Major
          WHEN v_current_streak >= 20 THEN 3  -- Notable
          WHEN v_current_streak >= 10 THEN 4  -- Supporting
          ELSE 5                               -- Contextual (5-9)
        END;

        INSERT INTO post_match_analysis (game_id, analysis_type, priority, headline, details, player_ids)
        VALUES (
          p_game_id, 'attendance_streak', v_streak_priority,
          CASE
            WHEN v_current_streak >= 50 THEN format('🏆 Legendary! %s reaches %s consecutive games!', v_player.friendly_name, v_current_streak)
            WHEN v_current_streak >= 30 THEN format('Iron man! %s reaches %s consecutive games', v_player.friendly_name, v_current_streak)
            WHEN v_current_streak >= 20 THEN format('Committed! %s hits %s consecutive games', v_player.friendly_name, v_current_streak)
            WHEN v_current_streak >= 10 THEN format('Consistent! %s reaches %s consecutive games', v_player.friendly_name, v_current_streak)
            ELSE format('On a roll! %s has played %s games in a row', v_player.friendly_name, v_current_streak)
          END,
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

COMMENT ON FUNCTION _generate_streak_insights IS 'Helper: generates attendance and win/loss streak insights with dynamic priorities';

-- =====================================================
-- CHANGE 3-5: Update get_whatsapp_summary
-- - More granular categories (debut, rivalry_first_win, etc.)
-- - Magnitude-aware selection within categories
-- - Player deduplication (spread headlines across more players)
-- - Phase 2 respects category uniqueness
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
  v_selected_categories TEXT[] := '{}';
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

  -- PHASE 1: Select best insight from each GRANULAR category
  -- With magnitude-aware selection and player deduplication
  FOR v_insight IN
    WITH positive_insights AS (
      SELECT
        id,
        headline,
        analysis_type,
        priority,
        player_ids,
        details,
        created_at,
        -- GRANULAR CATEGORIES to prevent duplicate types
        CASE
          -- Debut gets its own guaranteed category
          WHEN analysis_type = 'debut_appearance' THEN 'debut'
          -- Split appearances (non-debut)
          WHEN analysis_type IN ('return_after_absence', 'first_game_back_win') THEN 'return'
          -- Trophy
          WHEN analysis_type LIKE 'trophy%' THEN 'trophy'
          -- Split rivalry types
          WHEN analysis_type IN ('rivalry_first_win', 'first_ever_win_nemesis') THEN 'rivalry_first_win'
          WHEN analysis_type IN ('rivalry_perfect', 'rivalry_dominant', 'rivalry_close', 'rivalry_revenge') THEN 'rivalry_other'
          -- Split partnership types
          WHEN analysis_type = 'partnership_milestone' THEN 'partnership_milestone'
          WHEN analysis_type = 'partnership_first' THEN 'partnership_first'
          -- Split chemistry types
          WHEN analysis_type = 'chemistry_kings' THEN 'chemistry_duo'
          WHEN analysis_type = 'chemistry_milestone' THEN 'chemistry_milestone'
          -- Trio
          WHEN analysis_type LIKE 'trio_dream%' THEN 'trio'
          -- Cap milestones
          WHEN analysis_type = 'cap_milestone' THEN 'cap'
          -- Attendance streaks (separate from win/loss streaks)
          WHEN analysis_type = 'attendance_streak' THEN 'attendance'
          -- Win/loss streaks
          WHEN analysis_type IN ('win_streak', 'unbeaten_streak', 'losing_streak_ended', 'winless_streak_ended') THEN 'streak'
          -- Game records
          WHEN analysis_type = 'game_record' OR analysis_type LIKE 'team_best%' OR analysis_type LIKE 'blowout%' OR analysis_type LIKE 'shutout%' THEN 'record'
          -- Awards
          WHEN analysis_type LIKE 'award%' THEN 'award'
          -- Injury returns (positive)
          WHEN analysis_type = 'injury_token_return' THEN 'injury_return'
          -- Bench warmer
          WHEN analysis_type = 'bench_warmer_promoted' THEN 'bench_warmer'
          ELSE 'other'
        END as category,
        -- Extract magnitude for ordering within category
        CASE
          -- Streak magnitude
          WHEN analysis_type = 'attendance_streak' THEN COALESCE((details->>'streak')::INTEGER, 0)
          WHEN analysis_type IN ('win_streak', 'unbeaten_streak') THEN COALESCE((details->>'streak')::INTEGER, 0)
          WHEN analysis_type = 'losing_streak_ended' THEN COALESCE((details->>'ended_streak')::INTEGER, 0)
          -- Partnership magnitude
          WHEN analysis_type = 'partnership_milestone' THEN COALESCE((details->>'games_together')::INTEGER, 0)
          -- Chemistry magnitude
          WHEN analysis_type = 'chemistry_kings' THEN COALESCE((details->>'win_rate')::NUMERIC, 0)
          WHEN analysis_type = 'chemistry_milestone' THEN COALESCE((details->>'wins')::INTEGER, 0)
          -- Cap magnitude
          WHEN analysis_type = 'cap_milestone' THEN COALESCE((details->>'caps')::INTEGER, 0)
          -- Rivalry magnitude (previous losses for first_win)
          WHEN analysis_type IN ('rivalry_first_win', 'first_ever_win_nemesis') THEN COALESCE((details->>'previous_losses')::INTEGER, 0)
          -- Return absence magnitude
          WHEN analysis_type IN ('return_after_absence', 'first_game_back_win') THEN COALESCE((details->>'games_missed')::INTEGER, 0)
          -- Injury return magnitude
          WHEN analysis_type = 'injury_token_return' THEN COALESCE((details->>'return_streak')::INTEGER, 0)
          ELSE 0
        END as magnitude
      FROM post_match_analysis
      WHERE game_id = p_game_id
        -- Exclude negative insight types from headlines
        AND analysis_type NOT IN (
          'chemistry_curse',
          'trio_cursed',
          'losing_streak',
          'winless_streak',
          'rivalry_nemesis',
          'player_color_curse',
          'injury_token_used',
          'never_beaten_rivalry',
          'rivalry_ongoing_drought'
        )
    ),
    -- Get best insight from each category, preferring:
    -- 1. Lower priority number (more important)
    -- 2. Higher magnitude (more impressive)
    -- 3. Earlier created_at (first found)
    best_per_category AS (
      SELECT DISTINCT ON (category)
        id, headline, analysis_type, priority, player_ids, details, created_at, category, magnitude
      FROM positive_insights
      ORDER BY category, priority, magnitude DESC, created_at
    )
    -- Now select from best_per_category, prioritizing:
    -- 1. Player deduplication (prefer insights with new players)
    -- 2. Priority
    -- 3. Magnitude
    SELECT id, headline, player_ids, category
    FROM best_per_category
    ORDER BY
      priority,
      magnitude DESC,
      created_at
    LIMIT v_max_insights
  LOOP
    -- Check if this insight would add any new players (deduplication)
    -- Skip if ALL players are already mentioned (unless we have < 3 insights)
    IF v_count < 3 OR v_insight.player_ids IS NULL OR
       EXISTS (SELECT 1 FROM unnest(v_insight.player_ids) pid WHERE pid != ALL(v_mentioned_players)) THEN
      v_count := v_count + 1;
      v_summary := v_summary || format(E'\n%s. %s', v_count, v_insight.headline);
      v_selected_ids := v_selected_ids || v_insight.id;
      v_selected_categories := v_selected_categories || v_insight.category;
      -- Track mentioned players
      IF v_insight.player_ids IS NOT NULL AND array_length(v_insight.player_ids, 1) <= 5 THEN
        v_mentioned_players := v_mentioned_players || v_insight.player_ids;
      END IF;
    END IF;

    EXIT WHEN v_count >= v_max_insights;
  END LOOP;

  -- PHASE 2: Fill remaining slots with insights that mention NEW players
  -- Also respect category uniqueness (don't add same category twice)
  IF v_count < v_max_insights THEN
    FOR v_insight IN
      WITH candidate_insights AS (
        SELECT
          id,
          headline,
          player_ids,
          analysis_type,
          priority,
          details,
          created_at,
          -- Same granular category mapping
          CASE
            WHEN analysis_type = 'debut_appearance' THEN 'debut'
            WHEN analysis_type IN ('return_after_absence', 'first_game_back_win') THEN 'return'
            WHEN analysis_type LIKE 'trophy%' THEN 'trophy'
            WHEN analysis_type IN ('rivalry_first_win', 'first_ever_win_nemesis') THEN 'rivalry_first_win'
            WHEN analysis_type IN ('rivalry_perfect', 'rivalry_dominant', 'rivalry_close', 'rivalry_revenge') THEN 'rivalry_other'
            WHEN analysis_type = 'partnership_milestone' THEN 'partnership_milestone'
            WHEN analysis_type = 'partnership_first' THEN 'partnership_first'
            WHEN analysis_type = 'chemistry_kings' THEN 'chemistry_duo'
            WHEN analysis_type = 'chemistry_milestone' THEN 'chemistry_milestone'
            WHEN analysis_type LIKE 'trio_dream%' THEN 'trio'
            WHEN analysis_type = 'cap_milestone' THEN 'cap'
            WHEN analysis_type = 'attendance_streak' THEN 'attendance'
            WHEN analysis_type IN ('win_streak', 'unbeaten_streak', 'losing_streak_ended', 'winless_streak_ended') THEN 'streak'
            WHEN analysis_type = 'game_record' OR analysis_type LIKE 'team_best%' OR analysis_type LIKE 'blowout%' OR analysis_type LIKE 'shutout%' THEN 'record'
            WHEN analysis_type LIKE 'award%' THEN 'award'
            WHEN analysis_type = 'injury_token_return' THEN 'injury_return'
            WHEN analysis_type = 'bench_warmer_promoted' THEN 'bench_warmer'
            ELSE 'other'
          END as category,
          -- Magnitude for ordering
          CASE
            WHEN analysis_type = 'attendance_streak' THEN COALESCE((details->>'streak')::INTEGER, 0)
            WHEN analysis_type IN ('win_streak', 'unbeaten_streak') THEN COALESCE((details->>'streak')::INTEGER, 0)
            WHEN analysis_type = 'losing_streak_ended' THEN COALESCE((details->>'ended_streak')::INTEGER, 0)
            WHEN analysis_type = 'partnership_milestone' THEN COALESCE((details->>'games_together')::INTEGER, 0)
            WHEN analysis_type = 'chemistry_kings' THEN COALESCE((details->>'win_rate')::NUMERIC, 0)
            WHEN analysis_type = 'chemistry_milestone' THEN COALESCE((details->>'wins')::INTEGER, 0)
            WHEN analysis_type = 'cap_milestone' THEN COALESCE((details->>'caps')::INTEGER, 0)
            WHEN analysis_type IN ('rivalry_first_win', 'first_ever_win_nemesis') THEN COALESCE((details->>'previous_losses')::INTEGER, 0)
            WHEN analysis_type IN ('return_after_absence', 'first_game_back_win') THEN COALESCE((details->>'games_missed')::INTEGER, 0)
            WHEN analysis_type = 'injury_token_return' THEN COALESCE((details->>'return_streak')::INTEGER, 0)
            ELSE 0
          END as magnitude,
          -- Count NEW players this insight would add
          (
            SELECT COUNT(*)
            FROM unnest(pma.player_ids) AS pid
            WHERE pid != ALL(v_mentioned_players)
          ) as new_player_count
        FROM post_match_analysis pma
        WHERE game_id = p_game_id
          AND id != ALL(v_selected_ids)
          -- Exclude negative types
          AND analysis_type NOT IN (
            'chemistry_curse',
            'trio_cursed',
            'losing_streak',
            'winless_streak',
            'rivalry_nemesis',
            'player_color_curse',
            'injury_token_used',
            'never_beaten_rivalry',
            'rivalry_ongoing_drought'
          )
          -- Only consider insights with <= 5 players (skip team-wide)
          AND (player_ids IS NULL OR array_length(player_ids, 1) <= 5)
      )
      SELECT id, headline, player_ids, category, new_player_count
      FROM candidate_insights
      WHERE category != ALL(v_selected_categories)  -- Don't repeat categories
      ORDER BY
        -- Prefer insights with NEW players
        new_player_count DESC,
        priority,
        magnitude DESC,
        created_at
      LIMIT (v_max_insights - v_count)
    LOOP
      v_count := v_count + 1;
      v_summary := v_summary || format(E'\n%s. %s', v_count, v_insight.headline);
      v_selected_categories := v_selected_categories || v_insight.category;
      IF v_insight.player_ids IS NOT NULL THEN
        v_mentioned_players := v_mentioned_players || v_insight.player_ids;
      END IF;
    END LOOP;
  END IF;

  -- PHASE 3: If still not enough, allow repeating categories but prioritize new players
  IF v_count < v_max_insights THEN
    FOR v_insight IN
      SELECT
        id,
        headline,
        player_ids,
        (
          SELECT COUNT(*)
          FROM unnest(pma.player_ids) AS pid
          WHERE pid != ALL(v_mentioned_players)
        ) as new_player_count
      FROM post_match_analysis pma
      WHERE game_id = p_game_id
        AND id != ALL(v_selected_ids)
        AND analysis_type NOT IN (
          'chemistry_curse',
          'trio_cursed',
          'losing_streak',
          'winless_streak',
          'rivalry_nemesis',
          'player_color_curse',
          'injury_token_used',
          'never_beaten_rivalry',
          'rivalry_ongoing_drought'
        )
        AND (player_ids IS NULL OR array_length(player_ids, 1) <= 5)
      ORDER BY
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
Phase 1: Selects one insight from each GRANULAR category (ensuring type variety).
         - Categories: debut, return, trophy, rivalry_first_win, rivalry_other,
           partnership_milestone, partnership_first, chemistry_duo, chemistry_milestone,
           trio, cap, attendance, streak, record, award, injury_return, bench_warmer
         - Uses magnitude-aware selection (prefers higher streaks, more games together, etc.)
Phase 2: Fills remaining slots with insights from NEW categories that mention NEW players.
Phase 3: If still not full, allows repeating categories but still prefers new players.
Excludes negative insight types from headlines.
Player deduplication ensures headlines are spread across more players.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary of changes:
-- 1. debut_appearance: priority 1 (was 3), neutral wording, fixed timing
-- 2. attendance_streak: dynamic priority (50+=1, 30-49=2, 20-29=3, 10-19=4, 5-9=5)
--    Added 5-game milestone
-- 3. WhatsApp summary: granular categories prevent duplicate types
-- 4. WhatsApp summary: magnitude-aware selection within categories
-- 5. WhatsApp summary: player deduplication spreads headlines across more players
-- 6. WhatsApp summary: Phase 2 respects category uniqueness
-- =====================================================
