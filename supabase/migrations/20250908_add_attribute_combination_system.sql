-- Migration to add dynamic attribute combination system
-- This allows players to select attributes directly instead of predefined playstyles

-- Add boolean columns to player_ratings to store selected attributes
ALTER TABLE player_ratings 
ADD COLUMN has_pace BOOLEAN DEFAULT FALSE,
ADD COLUMN has_shooting BOOLEAN DEFAULT FALSE,
ADD COLUMN has_passing BOOLEAN DEFAULT FALSE,
ADD COLUMN has_dribbling BOOLEAN DEFAULT FALSE,
ADD COLUMN has_defending BOOLEAN DEFAULT FALSE,
ADD COLUMN has_physical BOOLEAN DEFAULT FALSE;

-- Create function to generate playstyle names from attribute combinations
CREATE OR REPLACE FUNCTION generate_playstyle_name(
    has_pace BOOLEAN,
    has_shooting BOOLEAN, 
    has_passing BOOLEAN,
    has_dribbling BOOLEAN,
    has_defending BOOLEAN,
    has_physical BOOLEAN
) RETURNS TEXT AS $$
DECLARE
    attributes TEXT[] := '{}';
    attribute_count INTEGER := 0;
    result TEXT;
BEGIN
    -- Build array of selected attributes
    IF has_pace THEN 
        attributes := array_append(attributes, 'Pace');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_shooting THEN 
        attributes := array_append(attributes, 'Shooting');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_passing THEN 
        attributes := array_append(attributes, 'Passing');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_dribbling THEN 
        attributes := array_append(attributes, 'Dribbling');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_defending THEN 
        attributes := array_append(attributes, 'Defending');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_physical THEN 
        attributes := array_append(attributes, 'Physical');
        attribute_count := attribute_count + 1;
    END IF;
    
    -- Handle special cases
    IF attribute_count = 0 THEN
        RETURN 'No Style Selected';
    ELSIF attribute_count = 6 THEN
        RETURN 'Complete Player';
    ELSIF attribute_count = 1 THEN
        RETURN attributes[1] || ' Specialist';
    ELSE
        -- For 2-5 attributes, join with ' & '
        RETURN array_to_string(attributes, ' & ');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate compact playstyle display
CREATE OR REPLACE FUNCTION generate_playstyle_compact(
    has_pace BOOLEAN,
    has_shooting BOOLEAN, 
    has_passing BOOLEAN,
    has_dribbling BOOLEAN,
    has_defending BOOLEAN,
    has_physical BOOLEAN
) RETURNS TEXT AS $$
DECLARE
    attributes TEXT[] := '{}';
    attribute_count INTEGER := 0;
BEGIN
    -- Build array of selected attributes (abbreviated)
    IF has_pace THEN 
        attributes := array_append(attributes, 'PAC');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_shooting THEN 
        attributes := array_append(attributes, 'SHO');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_passing THEN 
        attributes := array_append(attributes, 'PAS');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_dribbling THEN 
        attributes := array_append(attributes, 'DRI');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_defending THEN 
        attributes := array_append(attributes, 'DEF');
        attribute_count := attribute_count + 1;
    END IF;
    
    IF has_physical THEN 
        attributes := array_append(attributes, 'PHY');
        attribute_count := attribute_count + 1;
    END IF;
    
    -- Handle special cases
    IF attribute_count = 0 THEN
        RETURN 'None';
    ELSIF attribute_count = 6 THEN
        RETURN 'Complete';
    ELSE
        RETURN array_to_string(attributes, '+');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the derived attributes trigger to work with attribute combinations
CREATE OR REPLACE FUNCTION update_player_derived_attributes_v2()
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
    -- Now using direct attribute columns instead of playstyle weights
    SELECT 
        COUNT(*),
        COALESCE(SUM(CASE WHEN has_pace THEN 1.0 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN has_shooting THEN 1.0 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN has_passing THEN 1.0 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN has_dribbling THEN 1.0 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN has_defending THEN 1.0 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN has_physical THEN 1.0 ELSE 0 END), 0)
    INTO 
        v_rating_count,
        v_pace_total,
        v_shooting_total,
        v_passing_total,
        v_dribbling_total,
        v_defending_total,
        v_physical_total
    FROM player_ratings pr
    WHERE pr.rated_player_id = NEW.rated_player_id
    AND (has_pace OR has_shooting OR has_passing OR has_dribbling OR has_defending OR has_physical);

    -- Calculate averages, defaulting to 0 if no ratings
    IF v_rating_count > 0 THEN
        v_pace_avg := v_pace_total / v_rating_count;
        v_shooting_avg := v_shooting_total / v_rating_count;
        v_passing_avg := v_passing_total / v_rating_count;
        v_dribbling_avg := v_dribbling_total / v_rating_count;
        v_defending_avg := v_defending_total / v_rating_count;
        v_physical_avg := v_physical_total / v_rating_count;
    ELSE
        -- Default values when no attribute ratings exist
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

-- Create new trigger for attribute-based system
CREATE TRIGGER trigger_update_derived_attributes_v2
AFTER INSERT OR UPDATE OF has_pace, has_shooting, has_passing, has_dribbling, has_defending, has_physical ON player_ratings
FOR EACH ROW
EXECUTE FUNCTION update_player_derived_attributes_v2();

-- Temporarily disable old trigger to avoid conflicts during migration
DROP TRIGGER IF EXISTS trigger_update_derived_attributes ON player_ratings;

-- Create migration function to convert existing playstyle_id ratings to attribute combinations
CREATE OR REPLACE FUNCTION migrate_existing_playstyles()
RETURNS void AS $$
BEGIN
    -- Update ratings that have playstyle_id to have corresponding attribute flags
    UPDATE player_ratings pr
    SET 
        has_pace = COALESCE(ps.pace_weight, 0) > 0,
        has_shooting = COALESCE(ps.shooting_weight, 0) > 0,
        has_passing = COALESCE(ps.passing_weight, 0) > 0,
        has_dribbling = COALESCE(ps.dribbling_weight, 0) > 0,
        has_defending = COALESCE(ps.defending_weight, 0) > 0,
        has_physical = COALESCE(ps.physical_weight, 0) > 0
    FROM playstyles ps
    WHERE pr.playstyle_id = ps.id;
    
    RAISE NOTICE 'Migration complete: Converted % playstyle ratings to attribute combinations', 
        (SELECT COUNT(*) FROM player_ratings WHERE playstyle_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_existing_playstyles();

-- Clean up the migration function (no longer needed)
DROP FUNCTION migrate_existing_playstyles();

-- Create view for easy access to player ratings with generated playstyle names
CREATE OR REPLACE VIEW player_ratings_with_playstyles AS
SELECT 
    pr.*,
    generate_playstyle_name(
        pr.has_pace,
        pr.has_shooting,
        pr.has_passing,
        pr.has_dribbling,
        pr.has_defending,
        pr.has_physical
    ) as generated_playstyle_name,
    generate_playstyle_compact(
        pr.has_pace,
        pr.has_shooting,
        pr.has_passing,
        pr.has_dribbling,
        pr.has_defending,
        pr.has_physical
    ) as generated_playstyle_compact
FROM player_ratings pr;

-- Add RLS policy for the new view
ALTER TABLE player_ratings_with_playstyles ENABLE ROW LEVEL SECURITY;

-- Apply existing player_ratings policies to the new view
CREATE POLICY "Users can view all ratings" ON player_ratings_with_playstyles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create index for performance on the new attribute columns
CREATE INDEX idx_player_ratings_attributes ON player_ratings(has_pace, has_shooting, has_passing, has_dribbling, has_defending, has_physical);

-- Log completion
DO $$
DECLARE
    v_migrated_count INT;
    v_total_count INT;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM player_ratings;
    SELECT COUNT(*) INTO v_migrated_count 
    FROM player_ratings 
    WHERE has_pace OR has_shooting OR has_passing OR has_dribbling OR has_defending OR has_physical;
    
    RAISE NOTICE 'Attribute combination system installed. % of % ratings have attribute data', 
        v_migrated_count, v_total_count;
END $$;