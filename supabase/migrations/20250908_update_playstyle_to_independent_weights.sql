-- Migration to update playstyle system to use independent 1.0 weights
-- This allows versatile players to get higher total scores without artificial penalties

-- First, update all existing playstyles to use 1.0 for each selected attribute
-- This replaces the percentage-based system with independent scoring

-- Two-attribute playstyles (currently 1.0 + 1.0 = 2.0) - no change needed
-- These already use 1.0 per attribute

-- Three-attribute playstyles (currently 0.67 × 3 = 2.01) - update to 1.0 × 3 = 3.0
UPDATE playstyles
SET 
    pace_weight = CASE WHEN pace_weight > 0 THEN 1.0 ELSE pace_weight END,
    shooting_weight = CASE WHEN shooting_weight > 0 THEN 1.0 ELSE shooting_weight END,
    passing_weight = CASE WHEN passing_weight > 0 THEN 1.0 ELSE passing_weight END,
    dribbling_weight = CASE WHEN dribbling_weight > 0 THEN 1.0 ELSE dribbling_weight END,
    defending_weight = CASE WHEN defending_weight > 0 THEN 1.0 ELSE defending_weight END,
    physical_weight = CASE WHEN physical_weight > 0 THEN 1.0 ELSE physical_weight END
WHERE name IN ('Hawk', 'Engine', 'Anchor', 'Marksman', 'Maestro', 'Backbone');

-- Complete playstyles (currently 0.33 × 6 = 1.98) - update to 1.0 × 6 = 6.0  
UPDATE playstyles
SET 
    pace_weight = 1.0,
    shooting_weight = 1.0,
    passing_weight = 1.0,
    dribbling_weight = 1.0,
    defending_weight = 1.0,
    physical_weight = 1.0
WHERE name IN ('Complete Forward', 'Box-to-Box', 'Complete Defender');

-- Update default values in player_derived_attributes from 0.35 to 0
ALTER TABLE player_derived_attributes 
    ALTER COLUMN pace_rating SET DEFAULT 0,
    ALTER COLUMN shooting_rating SET DEFAULT 0,
    ALTER COLUMN passing_rating SET DEFAULT 0,
    ALTER COLUMN dribbling_rating SET DEFAULT 0,
    ALTER COLUMN defending_rating SET DEFAULT 0,
    ALTER COLUMN physical_rating SET DEFAULT 0;

-- Update existing default values for all players who haven't been rated
UPDATE player_derived_attributes
SET 
    pace_rating = 0,
    shooting_rating = 0,
    passing_rating = 0,
    dribbling_rating = 0,
    defending_rating = 0,
    physical_rating = 0
WHERE total_ratings_count = 0;

-- Update the trigger function to handle independent weights correctly
CREATE OR REPLACE FUNCTION update_player_derived_attributes()
RETURNS TRIGGER AS $$
DECLARE
    v_pace_total DECIMAL(10,2) := 0;
    v_shooting_total DECIMAL(10,2) := 0;
    v_passing_total DECIMAL(10,2) := 0;
    v_dribbling_total DECIMAL(10,2) := 0;
    v_defending_total DECIMAL(10,2) := 0;
    v_physical_total DECIMAL(10,2) := 0;
    v_rating_count INT := 0;
    v_pace_avg DECIMAL(3,2);
    v_shooting_avg DECIMAL(3,2);
    v_passing_avg DECIMAL(3,2);
    v_dribbling_avg DECIMAL(3,2);
    v_defending_avg DECIMAL(3,2);
    v_physical_avg DECIMAL(3,2);
BEGIN
    -- Calculate aggregate attributes from all ratings for this player
    SELECT 
        COUNT(*),
        COALESCE(SUM(ps.pace_weight), 0),
        COALESCE(SUM(ps.shooting_weight), 0),
        COALESCE(SUM(ps.passing_weight), 0),
        COALESCE(SUM(ps.dribbling_weight), 0),
        COALESCE(SUM(ps.defending_weight), 0),
        COALESCE(SUM(ps.physical_weight), 0)
    INTO 
        v_rating_count,
        v_pace_total,
        v_shooting_total,
        v_passing_total,
        v_dribbling_total,
        v_defending_total,
        v_physical_total
    FROM player_ratings pr
    LEFT JOIN playstyles ps ON pr.playstyle_id = ps.id
    WHERE pr.rated_player_id = NEW.rated_player_id
    AND pr.playstyle_id IS NOT NULL;

    -- Calculate averages, defaulting to 0 if no ratings
    IF v_rating_count > 0 THEN
        v_pace_avg := v_pace_total / v_rating_count;
        v_shooting_avg := v_shooting_total / v_rating_count;
        v_passing_avg := v_passing_total / v_rating_count;
        v_dribbling_avg := v_dribbling_total / v_rating_count;
        v_defending_avg := v_defending_total / v_rating_count;
        v_physical_avg := v_physical_total / v_rating_count;
    ELSE
        -- Default values when no playstyle ratings exist (changed from 0.35 to 0)
        v_pace_avg := 0;
        v_shooting_avg := 0;
        v_passing_avg := 0;
        v_dribbling_avg := 0;
        v_defending_avg := 0;
        v_physical_avg := 0;
    END IF;

    -- Insert or update the derived attributes
    INSERT INTO player_derived_attributes (
        player_id,
        pace_rating,
        shooting_rating,
        passing_rating,
        dribbling_rating,
        defending_rating,
        physical_rating,
        total_ratings_count,
        updated_at
    ) VALUES (
        NEW.rated_player_id,
        v_pace_avg,
        v_shooting_avg,
        v_passing_avg,
        v_dribbling_avg,
        v_defending_avg,
        v_physical_avg,
        v_rating_count,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (player_id) DO UPDATE SET
        pace_rating = v_pace_avg,
        shooting_rating = v_shooting_avg,
        passing_rating = v_passing_avg,
        dribbling_rating = v_dribbling_avg,
        defending_rating = v_defending_avg,
        physical_rating = v_physical_avg,
        total_ratings_count = v_rating_count,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the view to use 0 defaults instead of 0.35
CREATE OR REPLACE VIEW player_full_profiles AS
SELECT 
    p.id,
    p.friendly_name,
    p.average_attack_rating,
    p.average_defense_rating,
    p.average_game_iq_rating,
    COALESCE(pda.pace_rating, 0) as pace_rating,
    COALESCE(pda.shooting_rating, 0) as shooting_rating,
    COALESCE(pda.passing_rating, 0) as passing_rating,
    COALESCE(pda.dribbling_rating, 0) as dribbling_rating,
    COALESCE(pda.defending_rating, 0) as defending_rating,
    COALESCE(pda.physical_rating, 0) as physical_rating,
    COALESCE(pda.total_ratings_count, 0) as playstyle_ratings_count
FROM players p
LEFT JOIN player_derived_attributes pda ON p.id = pda.player_id;

-- Force recalculation of all derived attributes with new weights
-- This will trigger the updated function for each player
UPDATE player_ratings 
SET updated_at = CURRENT_TIMESTAMP 
WHERE playstyle_id IS NOT NULL;

-- Log the weight changes for verification
DO $$
DECLARE
    v_min_total DECIMAL(5,2);
    v_max_total DECIMAL(5,2);
    v_avg_total DECIMAL(5,2);
    v_count INT;
BEGIN
    SELECT 
        COUNT(*),
        MIN(pace_weight + shooting_weight + passing_weight + dribbling_weight + defending_weight + physical_weight),
        MAX(pace_weight + shooting_weight + passing_weight + dribbling_weight + defending_weight + physical_weight),
        AVG(pace_weight + shooting_weight + passing_weight + dribbling_weight + defending_weight + physical_weight)
    INTO v_count, v_min_total, v_max_total, v_avg_total
    FROM playstyles;
    
    RAISE NOTICE 'Playstyle weight update complete. % playstyles updated. Weight totals - Min: %, Max: %, Avg: %', 
        v_count, v_min_total, v_max_total, ROUND(v_avg_total, 2);
END $$;