-- Migration: Remove GK from Position Preferences
-- Date: 2025-11-21
-- Purpose: Remove GK as a selectable position preference (GK rating metric remains)
--
-- Background: With rotating goalkeeper system, players shouldn't rate GK as a position preference.
-- GK ratings (0-10) remain as one of the four core metrics (Attack/Defense/Game IQ/GK).

BEGIN;

-- Step 1: Create temporary table with corrected position ratings (GK removed, ranks adjusted)
CREATE TEMP TABLE temp_corrected_ratings AS
WITH gk_combinations AS (
  -- Find all rater+rated_player combinations that have GK ratings
  SELECT DISTINCT rater_id, rated_player_id
  FROM player_position_ratings
  WHERE position = 'GK'
),
all_affected_ratings AS (
  -- Get ALL ratings for those combinations
  SELECT
    ppr.id,
    ppr.rater_id,
    ppr.rated_player_id,
    ppr.position,
    ppr.rank,
    ppr.created_at,
    ppr.updated_at
  FROM player_position_ratings ppr
  INNER JOIN gk_combinations gc
    ON ppr.rater_id = gc.rater_id
    AND ppr.rated_player_id = gc.rated_player_id
),
non_gk_ratings AS (
  -- Filter out GK positions
  SELECT *
  FROM all_affected_ratings
  WHERE position != 'GK'
),
renumbered_ratings AS (
  -- Renumber ranks sequentially within each rater+rated_player group
  SELECT
    id,
    rater_id,
    rated_player_id,
    position,
    ROW_NUMBER() OVER (
      PARTITION BY rater_id, rated_player_id
      ORDER BY rank
    ) as new_rank,
    created_at,
    updated_at
  FROM non_gk_ratings
)
SELECT * FROM renumbered_ratings;

-- Step 2: Delete all position ratings for affected combinations
DELETE FROM player_position_ratings
WHERE (rater_id, rated_player_id) IN (
  SELECT DISTINCT rater_id, rated_player_id
  FROM player_position_ratings
  WHERE position = 'GK'
);

-- Step 3: Re-insert corrected ratings (without GK, with adjusted ranks)
INSERT INTO player_position_ratings (id, rater_id, rated_player_id, position, rank, created_at, updated_at)
SELECT id, rater_id, rated_player_id, position, new_rank, created_at, updated_at
FROM temp_corrected_ratings;

-- Step 4: Clean up consensus table (will be rebuilt by trigger, but clean explicitly)
DELETE FROM player_position_consensus
WHERE position = 'GK';

-- Step 5: Update CHECK constraints to remove 'GK' from valid positions

-- Drop existing constraints
ALTER TABLE player_position_ratings
DROP CONSTRAINT IF EXISTS player_position_ratings_position_check;

ALTER TABLE player_position_consensus
DROP CONSTRAINT IF EXISTS player_position_consensus_position_check;

-- Add new constraints without 'GK' (11 positions)
ALTER TABLE player_position_ratings
ADD CONSTRAINT player_position_ratings_position_check
CHECK (position IN ('LB', 'CB', 'RB', 'LWB', 'RWB', 'LW', 'CM', 'RW', 'CAM', 'CDM', 'ST'));

ALTER TABLE player_position_consensus
ADD CONSTRAINT player_position_consensus_position_check
CHECK (position IN ('LB', 'CB', 'RB', 'LWB', 'RWB', 'LW', 'CM', 'RW', 'CAM', 'CDM', 'ST'));

-- Step 6: Log migration results
DO $$
DECLARE
  v_ratings_count INTEGER;
  v_consensus_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_ratings_count FROM player_position_ratings;
  SELECT COUNT(*) INTO v_consensus_count FROM player_position_consensus;

  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Remaining position ratings: %', v_ratings_count;
  RAISE NOTICE 'Remaining consensus entries: %', v_consensus_count;
END $$;

COMMIT;

-- Verification queries (commented out, run manually if needed):
--
-- -- Verify no GK positions remain
-- SELECT COUNT(*) FROM player_position_ratings WHERE position = 'GK';  -- Should be 0
-- SELECT COUNT(*) FROM player_position_consensus WHERE position = 'GK';  -- Should be 0
--
-- -- Verify rank sequences are correct (should be 1, 2, or 3 only, no gaps)
-- SELECT rater_id, rated_player_id, array_agg(rank ORDER BY rank) as ranks
-- FROM player_position_ratings
-- GROUP BY rater_id, rated_player_id
-- HAVING array_agg(rank ORDER BY rank) != ARRAY[1]::integer[]
--   AND array_agg(rank ORDER BY rank) != ARRAY[1,2]::integer[]
--   AND array_agg(rank ORDER BY rank) != ARRAY[1,2,3]::integer[];  -- Should be empty
