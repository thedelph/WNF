-- Migration: Ranked Position System
-- Date: 2025-11-12
-- Description: Transform position rating system from checkbox-based to ranked points system
--              Players can select up to 3 positions with rankings (1st=3pts, 2nd=2pts, 3rd=1pt)
--              This migration clears all existing position data for a clean slate

-- ============================================================================
-- STEP 1: Drop existing triggers to prevent conflicts during migration
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_position_rating_update ON player_position_ratings;
DROP TRIGGER IF EXISTS trigger_position_rating_insert ON player_position_ratings;
DROP TRIGGER IF EXISTS trigger_position_rating_delete ON player_position_ratings;

-- ============================================================================
-- STEP 2: Clear all existing position data (user approved clean slate)
-- ============================================================================

DELETE FROM player_position_consensus;
DELETE FROM player_position_ratings;

-- ============================================================================
-- STEP 3: Modify player_position_ratings table structure
-- ============================================================================

-- Add rank column to store 1st/2nd/3rd choice (1=3pts, 2=2pts, 3=1pt)
ALTER TABLE player_position_ratings
ADD COLUMN rank INTEGER NOT NULL DEFAULT 1 CHECK (rank IN (1, 2, 3));

-- Drop old unique constraint (position-based)
ALTER TABLE player_position_ratings
DROP CONSTRAINT IF EXISTS player_position_ratings_rater_id_rated_player_id_position_key;

-- Add new unique constraint (rank-based: each rater can only have one position per rank)
ALTER TABLE player_position_ratings
ADD CONSTRAINT player_position_ratings_rater_id_rated_player_id_rank_key
UNIQUE (rater_id, rated_player_id, rank);

-- Update position CHECK constraint to ensure all 12 positions are valid
ALTER TABLE player_position_ratings
DROP CONSTRAINT IF EXISTS player_position_ratings_position_check;

ALTER TABLE player_position_ratings
ADD CONSTRAINT player_position_ratings_position_check
CHECK (position IN ('GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'LW', 'CM', 'RW', 'CAM', 'CDM', 'ST'));

-- ============================================================================
-- STEP 4: Modify player_position_consensus table structure
-- ============================================================================

-- Add weighted points calculation columns
ALTER TABLE player_position_consensus
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

ALTER TABLE player_position_consensus
ADD COLUMN IF NOT EXISTS rank_1_count INTEGER DEFAULT 0;

ALTER TABLE player_position_consensus
ADD COLUMN IF NOT EXISTS rank_2_count INTEGER DEFAULT 0;

ALTER TABLE player_position_consensus
ADD COLUMN IF NOT EXISTS rank_3_count INTEGER DEFAULT 0;

-- Update position CHECK constraint to match ratings table
ALTER TABLE player_position_consensus
DROP CONSTRAINT IF EXISTS player_position_consensus_position_check;

ALTER TABLE player_position_consensus
ADD CONSTRAINT player_position_consensus_position_check
CHECK (position IN ('GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'LW', 'CM', 'RW', 'CAM', 'CDM', 'ST'));

-- ============================================================================
-- STEP 5: Create new trigger function with weighted points calculation
-- ============================================================================

CREATE OR REPLACE FUNCTION update_position_consensus()
RETURNS TRIGGER AS $$
DECLARE
  affected_player_id UUID;
BEGIN
  -- Determine which player's consensus needs updating
  IF TG_OP = 'DELETE' THEN
    affected_player_id := OLD.rated_player_id;
  ELSE
    affected_player_id := NEW.rated_player_id;
  END IF;

  -- Delete all consensus entries for this player (will be recalculated)
  DELETE FROM player_position_consensus
  WHERE player_id = affected_player_id;

  -- Calculate new consensus for each position this player has been rated for
  -- Points calculation: rank 1 = 3pts, rank 2 = 2pts, rank 3 = 1pt
  -- Percentage = (total points / (total raters * 6)) * 100
  -- Max points per rater = 6 (if they rate all 3 positions: 3+2+1)
  INSERT INTO player_position_consensus (
    player_id,
    position,
    rating_count,
    total_raters,
    percentage,
    points,
    rank_1_count,
    rank_2_count,
    rank_3_count,
    updated_at
  )
  SELECT
    rated_player_id,
    position,
    COUNT(*) as rating_count,
    (
      SELECT COUNT(DISTINCT rater_id)
      FROM player_position_ratings
      WHERE rated_player_id = affected_player_id
    ) as total_raters,
    -- Percentage based on weighted points
    ROUND(
      (
        SUM(CASE
          WHEN rank = 1 THEN 3
          WHEN rank = 2 THEN 2
          WHEN rank = 3 THEN 1
          ELSE 0
        END)::NUMERIC /
        (
          (SELECT COUNT(DISTINCT rater_id)
           FROM player_position_ratings
           WHERE rated_player_id = affected_player_id) * 6
        )::NUMERIC
      ) * 100,
      1
    ) as percentage,
    -- Total weighted points for this position
    SUM(CASE
      WHEN rank = 1 THEN 3
      WHEN rank = 2 THEN 2
      WHEN rank = 3 THEN 1
      ELSE 0
    END) as points,
    -- Count of each rank type
    SUM(CASE WHEN rank = 1 THEN 1 ELSE 0 END) as rank_1_count,
    SUM(CASE WHEN rank = 2 THEN 1 ELSE 0 END) as rank_2_count,
    SUM(CASE WHEN rank = 3 THEN 1 ELSE 0 END) as rank_3_count,
    NOW() as updated_at
  FROM player_position_ratings
  WHERE rated_player_id = affected_player_id
  GROUP BY rated_player_id, position
  HAVING COUNT(DISTINCT rater_id) > 0;  -- Only create consensus if at least 1 rater

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create triggers to automatically update consensus
-- ============================================================================

CREATE TRIGGER trigger_position_rating_insert
AFTER INSERT ON player_position_ratings
FOR EACH ROW
EXECUTE FUNCTION update_position_consensus();

CREATE TRIGGER trigger_position_rating_update
AFTER UPDATE ON player_position_ratings
FOR EACH ROW
EXECUTE FUNCTION update_position_consensus();

CREATE TRIGGER trigger_position_rating_delete
AFTER DELETE ON player_position_ratings
FOR EACH ROW
EXECUTE FUNCTION update_position_consensus();

-- ============================================================================
-- STEP 7: Add helpful comments for future reference
-- ============================================================================

COMMENT ON COLUMN player_position_ratings.rank IS
'Position ranking: 1 (best/primary, 3pts), 2 (secondary, 2pts), 3 (tertiary, 1pt)';

COMMENT ON COLUMN player_position_consensus.points IS
'Total weighted points for this position (sum of 3pts for rank 1, 2pts for rank 2, 1pt for rank 3)';

COMMENT ON COLUMN player_position_consensus.percentage IS
'Percentage calculated as (points / (total_raters * 6)) * 100. Max points per rater is 6 (3+2+1 if all ranks filled)';

COMMENT ON COLUMN player_position_consensus.rank_1_count IS
'Number of raters who selected this position as their 1st choice (3 points each)';

COMMENT ON COLUMN player_position_consensus.rank_2_count IS
'Number of raters who selected this position as their 2nd choice (2 points each)';

COMMENT ON COLUMN player_position_consensus.rank_3_count IS
'Number of raters who selected this position as their 3rd choice (1 point each)';

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Verification query (optional - shows table structure)
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'player_position_ratings'
-- ORDER BY ordinal_position;
