-- Migration to rebalance playstyle weights so all total to approximately 2.0
-- This ensures no playstyle type has an unfair advantage

-- Update three-attribute playstyles from 0.80 to 0.67 per attribute (2.40 → 2.01)
UPDATE playstyles
SET 
    pace_weight = CASE WHEN pace_weight = 0.80 THEN 0.67 ELSE pace_weight END,
    shooting_weight = CASE WHEN shooting_weight = 0.80 THEN 0.67 ELSE shooting_weight END,
    passing_weight = CASE WHEN passing_weight = 0.80 THEN 0.67 ELSE passing_weight END,
    dribbling_weight = CASE WHEN dribbling_weight = 0.80 THEN 0.67 ELSE dribbling_weight END,
    defending_weight = CASE WHEN defending_weight = 0.80 THEN 0.67 ELSE defending_weight END,
    physical_weight = CASE WHEN physical_weight = 0.80 THEN 0.67 ELSE physical_weight END
WHERE name IN ('Hawk', 'Engine', 'Anchor', 'Marksman', 'Maestro', 'Backbone');

-- Update all-rounder playstyles from 0.35 to 0.33 per attribute (2.10 → 1.98)
UPDATE playstyles
SET 
    pace_weight = 0.33,
    shooting_weight = 0.33,
    passing_weight = 0.33,
    dribbling_weight = 0.33,
    defending_weight = 0.33,
    physical_weight = 0.33
WHERE name IN ('Complete Forward', 'Box-to-Box', 'Complete Defender');

-- Force recalculation of all derived attributes by updating player_ratings
-- This will trigger the update_player_derived_attributes() function for each player
UPDATE player_ratings 
SET updated_at = CURRENT_TIMESTAMP 
WHERE playstyle_id IS NOT NULL;

-- Verify the rebalancing (for logging purposes)
DO $$
DECLARE
    v_min_total DECIMAL(3,2);
    v_max_total DECIMAL(3,2);
BEGIN
    SELECT 
        MIN(pace_weight + shooting_weight + passing_weight + dribbling_weight + defending_weight + physical_weight),
        MAX(pace_weight + shooting_weight + passing_weight + dribbling_weight + defending_weight + physical_weight)
    INTO v_min_total, v_max_total
    FROM playstyles;
    
    RAISE NOTICE 'Playstyle weight rebalancing complete. Min total: %, Max total: %', v_min_total, v_max_total;
END $$;