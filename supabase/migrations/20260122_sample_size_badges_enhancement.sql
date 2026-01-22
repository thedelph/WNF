-- =====================================================
-- Sample Size Badges Enhancement
-- =====================================================
-- This migration:
-- 1. Creates/updates get_confidence_thresholds RPC with partnership category
-- 2. Adds dynamic thresholds based on actual data distribution (percentiles)
-- 3. Creates helper function for sample-size-based priority modifier
-- =====================================================

-- =====================================================
-- FUNCTION 1: get_confidence_thresholds
-- Returns dynamic thresholds based on actual data distribution
-- Calculates 33rd and 67th percentiles for each insight category
-- =====================================================
CREATE OR REPLACE FUNCTION get_confidence_thresholds()
RETURNS TABLE (
  insight_category TEXT,
  low_threshold INTEGER,
  high_threshold INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trio_low INTEGER;
  v_trio_high INTEGER;
  v_chemistry_low INTEGER;
  v_chemistry_high INTEGER;
  v_rivalry_low INTEGER;
  v_rivalry_high INTEGER;
  v_partnership_low INTEGER;
  v_partnership_high INTEGER;
BEGIN
  -- TRIO THRESHOLDS: Based on trio_chemistry table
  -- Calculate 33rd and 67th percentiles of games_together
  SELECT
    COALESCE(PERCENTILE_CONT(0.33) WITHIN GROUP (ORDER BY games_together)::INTEGER, 6),
    COALESCE(PERCENTILE_CONT(0.67) WITHIN GROUP (ORDER BY games_together)::INTEGER, 9)
  INTO v_trio_low, v_trio_high
  FROM trio_chemistry
  WHERE games_together >= 5;  -- Only consider trios that meet minimum threshold

  -- CHEMISTRY THRESHOLDS: Based on player_chemistry table (same-team duos)
  SELECT
    COALESCE(PERCENTILE_CONT(0.33) WITHIN GROUP (ORDER BY games_together)::INTEGER, 14),
    COALESCE(PERCENTILE_CONT(0.67) WITHIN GROUP (ORDER BY games_together)::INTEGER, 19)
  INTO v_chemistry_low, v_chemistry_high
  FROM player_chemistry
  WHERE games_together >= 10;  -- Only consider duos that meet minimum threshold

  -- RIVALRY THRESHOLDS: Based on player_rivalry table (cross-team matchups)
  SELECT
    COALESCE(PERCENTILE_CONT(0.33) WITHIN GROUP (ORDER BY total_games)::INTEGER, 17),
    COALESCE(PERCENTILE_CONT(0.67) WITHIN GROUP (ORDER BY total_games)::INTEGER, 24)
  INTO v_rivalry_low, v_rivalry_high
  FROM player_rivalry
  WHERE total_games >= 5;  -- Only consider rivalries that meet minimum threshold

  -- PARTNERSHIP THRESHOLDS: Based on player_chemistry table (same-team duos)
  -- Partnership milestones occur at 10, 25, 50, 75, 100 games
  -- Use same data as chemistry but different thresholds
  SELECT
    COALESCE(PERCENTILE_CONT(0.33) WITHIN GROUP (ORDER BY games_together)::INTEGER, 15),
    COALESCE(PERCENTILE_CONT(0.67) WITHIN GROUP (ORDER BY games_together)::INTEGER, 25)
  INTO v_partnership_low, v_partnership_high
  FROM player_chemistry
  WHERE games_together >= 10;

  -- Return all thresholds
  RETURN QUERY VALUES
    ('trio'::TEXT, v_trio_low, v_trio_high),
    ('chemistry'::TEXT, v_chemistry_low, v_chemistry_high),
    ('rivalry'::TEXT, v_rivalry_low, v_rivalry_high),
    ('partnership'::TEXT, v_partnership_low, v_partnership_high);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_confidence_thresholds() TO authenticated, anon;

COMMENT ON FUNCTION get_confidence_thresholds() IS
'Returns dynamic confidence thresholds based on actual data distribution.
Calculates 33rd and 67th percentiles of sample sizes for each insight category:
- trio: Games together for trio_chemistry
- chemistry: Games together for player_chemistry (duos)
- rivalry: Total games for player_rivalry
- partnership: Games together for player_chemistry (same-team)

These thresholds are used by the frontend to display Low/Med/High confidence badges
on percentage-based insights (chemistry, rivalries, partnerships).

Low confidence: Below 33rd percentile
Medium confidence: Between 33rd and 67th percentile
High confidence: Above 67th percentile';


-- =====================================================
-- FUNCTION 2: get_priority_modifier_for_sample_size
-- Helper function to calculate priority adjustment based on sample size
-- Returns -1 (boost), 0 (neutral), or +1 (penalty)
-- =====================================================
CREATE OR REPLACE FUNCTION get_priority_modifier_for_sample_size(
  p_category TEXT,
  p_sample_size INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_low_threshold INTEGER;
  v_high_threshold INTEGER;
BEGIN
  -- Get thresholds for this category
  SELECT low_threshold, high_threshold
  INTO v_low_threshold, v_high_threshold
  FROM get_confidence_thresholds()
  WHERE insight_category = p_category;

  -- Handle unknown category
  IF v_low_threshold IS NULL THEN
    RETURN 0;  -- No modification for unknown categories
  END IF;

  -- Calculate priority modifier
  -- Higher sample size = better priority (lower number)
  IF p_sample_size >= v_high_threshold THEN
    RETURN -1;  -- Boost priority (e.g., 3 becomes 2)
  ELSIF p_sample_size < v_low_threshold THEN
    RETURN 1;   -- Penalty (e.g., 3 becomes 4)
  ELSE
    RETURN 0;   -- No change (medium confidence)
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_priority_modifier_for_sample_size(TEXT, INTEGER) TO authenticated, anon;

COMMENT ON FUNCTION get_priority_modifier_for_sample_size(TEXT, INTEGER) IS
'Calculates priority adjustment based on sample size percentile position.
Returns:
  -1 = Boost priority (top 33% of sample sizes)
   0 = No change (middle 33%)
  +1 = Penalty (bottom 33%)

Categories supported: trio, chemistry, rivalry, partnership

Example usage in insight generation:
  v_base_priority := 3;
  v_priority := v_base_priority + get_priority_modifier_for_sample_size(''rivalry'', v_games);
  -- Result: 2 if high confidence, 3 if medium, 4 if low';


-- =====================================================
-- UPDATE: _generate_milestone_insights with partnership badges support
-- Adds player names to partnership_milestone details for badge display
-- =====================================================
-- Note: The existing function stores games_together in details, which is
-- already sufficient for the frontend to show badges. The badge calculation
-- uses sampleSize = details.games_together, which is already present.
-- This is verified by checking InsightsSection.tsx line 500:
--   const gamesTogether = details.games_together as number | undefined;


-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary of changes:
-- 1. Created get_confidence_thresholds RPC with 4 categories (trio, chemistry, rivalry, partnership)
-- 2. Created get_priority_modifier_for_sample_size helper for dynamic priority
-- 3. Partnership insights now show confidence badges via existing games_together field
--
-- Frontend changes required (already implemented):
-- - InsightsSection.tsx: Added partnership to isPercentageInsight check
-- - InsightsSection.tsx: Added partnership category in getConfidenceInfo()
-- - usePostMatchAnalysis.ts: Added partnership default threshold fallback
-- =====================================================
