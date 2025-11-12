-- Migration: Add Position Ratings System
-- Description: Creates tables and triggers for tracking player position preferences
-- Author: Claude Code
-- Date: 2025-11-12

-- ============================================================================
-- TABLE: player_position_ratings
-- Purpose: Store individual position selections from each rater
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_position_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rater_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    rated_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    position VARCHAR(10) NOT NULL CHECK (position IN ('GK', 'LB', 'CB', 'RB', 'WB', 'LM', 'CM', 'RM', 'CAM', 'CDM', 'ST')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one rater can only select each position once per player
    CONSTRAINT unique_rater_player_position UNIQUE(rater_id, rated_player_id, position)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_position_ratings_rater ON player_position_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_position_ratings_rated_player ON player_position_ratings(rated_player_id);
CREATE INDEX IF NOT EXISTS idx_position_ratings_position ON player_position_ratings(position);
CREATE INDEX IF NOT EXISTS idx_position_ratings_created_at ON player_position_ratings(created_at DESC);

-- ============================================================================
-- TABLE: player_position_consensus
-- Purpose: Pre-calculated aggregates showing position consensus per player
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_position_consensus (
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    position VARCHAR(10) NOT NULL CHECK (position IN ('GK', 'LB', 'CB', 'RB', 'WB', 'LM', 'CM', 'RM', 'CAM', 'CDM', 'ST')),
    rating_count INTEGER NOT NULL DEFAULT 0,  -- How many raters selected this position
    total_raters INTEGER NOT NULL DEFAULT 0,  -- Total unique raters who rated this player
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00, -- rating_count / total_raters * 100
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (player_id, position)
);

-- Indexes for consensus queries
CREATE INDEX IF NOT EXISTS idx_position_consensus_player ON player_position_consensus(player_id);
CREATE INDEX IF NOT EXISTS idx_position_consensus_percentage ON player_position_consensus(percentage DESC);
CREATE INDEX IF NOT EXISTS idx_position_consensus_rating_count ON player_position_consensus(rating_count DESC);

-- ============================================================================
-- TRIGGER FUNCTION: update_position_consensus
-- Purpose: Auto-calculate position percentages when ratings change
-- ============================================================================
CREATE OR REPLACE FUNCTION update_position_consensus()
RETURNS TRIGGER AS $$
DECLARE
    affected_player_id UUID;
BEGIN
    -- Determine which player was affected
    IF TG_OP = 'DELETE' THEN
        affected_player_id := OLD.rated_player_id;
    ELSE
        affected_player_id := NEW.rated_player_id;
    END IF;

    -- Delete existing consensus for this player
    DELETE FROM player_position_consensus WHERE player_id = affected_player_id;

    -- Recalculate consensus for all positions
    INSERT INTO player_position_consensus (player_id, position, rating_count, total_raters, percentage)
    SELECT
        affected_player_id as player_id,
        pos.position,
        COALESCE(COUNT(ppr.position), 0) as rating_count,
        GREATEST(
            (SELECT COUNT(DISTINCT rater_id)
             FROM player_position_ratings
             WHERE rated_player_id = affected_player_id),
            1  -- Prevent division by zero
        ) as total_raters,
        CASE
            WHEN (SELECT COUNT(DISTINCT rater_id) FROM player_position_ratings WHERE rated_player_id = affected_player_id) > 0
            THEN (
                COALESCE(COUNT(ppr.position), 0)::NUMERIC /
                (SELECT COUNT(DISTINCT rater_id) FROM player_position_ratings WHERE rated_player_id = affected_player_id)::NUMERIC * 100
            )
            ELSE 0.00
        END as percentage
    FROM (
        VALUES
            ('GK'::VARCHAR(10)),
            ('LB'::VARCHAR(10)),
            ('CB'::VARCHAR(10)),
            ('RB'::VARCHAR(10)),
            ('WB'::VARCHAR(10)),
            ('LM'::VARCHAR(10)),
            ('CM'::VARCHAR(10)),
            ('RM'::VARCHAR(10)),
            ('CAM'::VARCHAR(10)),
            ('CDM'::VARCHAR(10)),
            ('ST'::VARCHAR(10))
    ) AS pos(position)
    LEFT JOIN player_position_ratings ppr
        ON ppr.rated_player_id = affected_player_id
        AND ppr.position = pos.position
    GROUP BY pos.position;

    -- Update timestamp
    UPDATE player_position_consensus
    SET updated_at = NOW()
    WHERE player_id = affected_player_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Apply consensus updates on rating changes
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_position_rating_insert ON player_position_ratings;
CREATE TRIGGER trigger_position_rating_insert
AFTER INSERT ON player_position_ratings
FOR EACH ROW
EXECUTE FUNCTION update_position_consensus();

DROP TRIGGER IF EXISTS trigger_position_rating_update ON player_position_ratings;
CREATE TRIGGER trigger_position_rating_update
AFTER UPDATE ON player_position_ratings
FOR EACH ROW
EXECUTE FUNCTION update_position_consensus();

DROP TRIGGER IF EXISTS trigger_position_rating_delete ON player_position_ratings;
CREATE TRIGGER trigger_position_rating_delete
AFTER DELETE ON player_position_ratings
FOR EACH ROW
EXECUTE FUNCTION update_position_consensus();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE player_position_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_position_consensus ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Players can insert their own position ratings" ON player_position_ratings;
DROP POLICY IF EXISTS "Players can update their own position ratings" ON player_position_ratings;
DROP POLICY IF EXISTS "Players can delete their own position ratings" ON player_position_ratings;
DROP POLICY IF EXISTS "Players can view all position ratings" ON player_position_ratings;
DROP POLICY IF EXISTS "Super admins can view all position ratings" ON player_position_ratings;
DROP POLICY IF EXISTS "Players can view all position consensus" ON player_position_consensus;
DROP POLICY IF EXISTS "Super admins can view all position consensus" ON player_position_consensus;

-- POLICY: Players can insert their own position ratings
CREATE POLICY "Players can insert their own position ratings"
ON player_position_ratings
FOR INSERT
TO authenticated
WITH CHECK (
    rater_id IN (
        SELECT id FROM players WHERE user_id = auth.uid()
    )
);

-- POLICY: Players can update their own position ratings
CREATE POLICY "Players can update their own position ratings"
ON player_position_ratings
FOR UPDATE
TO authenticated
USING (
    rater_id IN (
        SELECT id FROM players WHERE user_id = auth.uid()
    )
);

-- POLICY: Players can delete their own position ratings
CREATE POLICY "Players can delete their own position ratings"
ON player_position_ratings
FOR DELETE
TO authenticated
USING (
    rater_id IN (
        SELECT id FROM players WHERE user_id = auth.uid()
    )
);

-- POLICY: Authenticated users can view all position ratings (for admin interface)
CREATE POLICY "Players can view all position ratings"
ON player_position_ratings
FOR SELECT
TO authenticated
USING (true);

-- POLICY: Super admins have full access to position ratings
CREATE POLICY "Super admins can view all position ratings"
ON player_position_ratings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM players
        WHERE user_id = auth.uid()
        AND is_super_admin = true
    )
);

-- POLICY: All authenticated users can view position consensus (public aggregate data)
CREATE POLICY "Players can view all position consensus"
ON player_position_consensus
FOR SELECT
TO authenticated
USING (true);

-- POLICY: Super admins have full access to position consensus
CREATE POLICY "Super admins can view all position consensus"
ON player_position_consensus
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM players
        WHERE user_id = auth.uid()
        AND is_super_admin = true
    )
);

-- ============================================================================
-- COMMENTS: Document the schema
-- ============================================================================
COMMENT ON TABLE player_position_ratings IS 'Stores individual position selections from each rater for each player';
COMMENT ON TABLE player_position_consensus IS 'Pre-calculated aggregates showing what percentage of raters selected each position for each player';
COMMENT ON FUNCTION update_position_consensus() IS 'Trigger function that recalculates position consensus percentages when ratings change';

COMMENT ON COLUMN player_position_ratings.rater_id IS 'Player who is giving the rating';
COMMENT ON COLUMN player_position_ratings.rated_player_id IS 'Player being rated';
COMMENT ON COLUMN player_position_ratings.position IS 'Position where the rated player excels (GK, LB, CB, RB, WB, LM, CM, RM, CAM, CDM, ST)';

COMMENT ON COLUMN player_position_consensus.rating_count IS 'Number of raters who selected this position for this player';
COMMENT ON COLUMN player_position_consensus.total_raters IS 'Total number of unique raters who have rated this player for any position';
COMMENT ON COLUMN player_position_consensus.percentage IS 'Percentage of raters who selected this position (rating_count / total_raters * 100)';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================
-- Uncomment to test the migration:

-- Test 1: Insert sample position ratings
-- INSERT INTO player_position_ratings (rater_id, rated_player_id, position)
-- SELECT
--     (SELECT id FROM players LIMIT 1) as rater_id,
--     (SELECT id FROM players OFFSET 1 LIMIT 1) as rated_player_id,
--     'ST' as position;

-- Test 2: View consensus for a player
-- SELECT * FROM player_position_consensus
-- WHERE player_id = (SELECT id FROM players OFFSET 1 LIMIT 1)
-- ORDER BY percentage DESC;

-- Test 3: Check trigger is working
-- SELECT
--     p.friendly_name,
--     pc.position,
--     pc.rating_count,
--     pc.total_raters,
--     pc.percentage
-- FROM player_position_consensus pc
-- JOIN players p ON p.id = pc.player_id
-- WHERE pc.percentage > 0
-- ORDER BY p.friendly_name, pc.percentage DESC;
