-- Create enum for playstyle categories
CREATE TYPE playstyle_category AS ENUM ('attacking', 'midfield', 'defensive');

-- Create table for playstyle definitions
CREATE TABLE playstyles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    category playstyle_category NOT NULL,
    pace_weight DECIMAL(3,2) DEFAULT 0,
    shooting_weight DECIMAL(3,2) DEFAULT 0,
    passing_weight DECIMAL(3,2) DEFAULT 0,
    dribbling_weight DECIMAL(3,2) DEFAULT 0,
    defending_weight DECIMAL(3,2) DEFAULT 0,
    physical_weight DECIMAL(3,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert playstyle definitions with balanced weights
INSERT INTO playstyles (name, category, pace_weight, shooting_weight, passing_weight, dribbling_weight, defending_weight, physical_weight, description) VALUES
-- Attacking Styles
('Complete Forward', 'attacking', 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 'Balanced all-round attacker'),
('Hunter', 'attacking', 1.0, 1.0, 0, 0, 0, 0, 'Pace + Shooting'),
('Hawk', 'attacking', 0.8, 0.8, 0, 0, 0, 0.8, 'Pace + Shooting + Physical'),
('Marksman', 'attacking', 0, 0.8, 0, 0.8, 0, 0.8, 'Shooting + Dribbling + Physical'),
('Finisher', 'attacking', 0, 1.0, 0, 0, 0, 1.0, 'Shooting + Physical'),
('Sniper', 'attacking', 0, 1.0, 0, 1.0, 0, 0, 'Shooting + Dribbling'),
('Deadeye', 'attacking', 0, 1.0, 1.0, 0, 0, 0, 'Shooting + Passing'),
-- Midfield Styles
('Box-to-Box', 'midfield', 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 'Balanced all-round midfielder'),
('Engine', 'midfield', 0.8, 0, 0.8, 0.8, 0, 0, 'Pace + Passing + Dribbling'),
('Artist', 'midfield', 0, 0, 1.0, 1.0, 0, 0, 'Passing + Dribbling'),
('Architect', 'midfield', 0, 0, 1.0, 0, 0, 1.0, 'Passing + Physical'),
('Powerhouse', 'midfield', 0, 0, 1.0, 0, 1.0, 0, 'Passing + Defending'),
('Maestro', 'midfield', 0, 0.8, 0.8, 0.8, 0, 0, 'Shooting + Passing + Dribbling'),
('Catalyst', 'midfield', 1.0, 0, 1.0, 0, 0, 0, 'Pace + Passing'),
-- Defensive Styles
('Complete Defender', 'defensive', 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 'Balanced all-round defender'),
('Shadow', 'defensive', 1.0, 0, 0, 0, 1.0, 0, 'Pace + Defending'),
('Anchor', 'defensive', 0.8, 0, 0, 0, 0.8, 0.8, 'Pace + Defending + Physical'),
('Gladiator', 'defensive', 0, 1.0, 0, 0, 1.0, 0, 'Shooting + Defending'),
('Guardian', 'defensive', 0, 0, 0, 1.0, 1.0, 0, 'Dribbling + Defending'),
('Sentinel', 'defensive', 0, 0, 0, 0, 1.0, 1.0, 'Defending + Physical'),
('Backbone', 'defensive', 0, 0, 0.8, 0, 0.8, 0.8, 'Passing + Defending + Physical');

-- Add playstyle column to player_ratings table (single column, not three)
ALTER TABLE player_ratings 
ADD COLUMN playstyle_id UUID REFERENCES playstyles(id);

-- Create table for aggregated player attributes derived from playstyles
CREATE TABLE player_derived_attributes (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    pace_rating DECIMAL(3,2) DEFAULT 0.35,
    shooting_rating DECIMAL(3,2) DEFAULT 0.35,
    passing_rating DECIMAL(3,2) DEFAULT 0.35,
    dribbling_rating DECIMAL(3,2) DEFAULT 0.35,
    defending_rating DECIMAL(3,2) DEFAULT 0.35,
    physical_rating DECIMAL(3,2) DEFAULT 0.35,
    total_ratings_count INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update derived attributes when playstyles are rated
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

    -- Calculate averages, defaulting to 0.35 if no ratings
    IF v_rating_count > 0 THEN
        v_pace_avg := v_pace_total / v_rating_count;
        v_shooting_avg := v_shooting_total / v_rating_count;
        v_passing_avg := v_passing_total / v_rating_count;
        v_dribbling_avg := v_dribbling_total / v_rating_count;
        v_defending_avg := v_defending_total / v_rating_count;
        v_physical_avg := v_physical_total / v_rating_count;
    ELSE
        -- Default values when no playstyle ratings exist
        v_pace_avg := 0.35;
        v_shooting_avg := 0.35;
        v_passing_avg := 0.35;
        v_dribbling_avg := 0.35;
        v_defending_avg := 0.35;
        v_physical_avg := 0.35;
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

-- Create trigger for updating derived attributes
CREATE TRIGGER trigger_update_derived_attributes
AFTER INSERT OR UPDATE OF playstyle_id ON player_ratings
FOR EACH ROW
EXECUTE FUNCTION update_player_derived_attributes();

-- Initialize derived attributes for all existing players with defaults
INSERT INTO player_derived_attributes (player_id)
SELECT id FROM players
ON CONFLICT (player_id) DO NOTHING;

-- Add RLS policies
ALTER TABLE playstyles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_derived_attributes ENABLE ROW LEVEL SECURITY;

-- Everyone can read playstyles
CREATE POLICY "Public can view playstyles" ON playstyles
    FOR SELECT USING (true);

-- Only authenticated users can read derived attributes
CREATE POLICY "Authenticated users can view derived attributes" ON player_derived_attributes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow the trigger function to update derived attributes
CREATE POLICY "System can update derived attributes" ON player_derived_attributes
    FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_player_ratings_playstyle ON player_ratings(playstyle_id);
CREATE INDEX idx_player_derived_attributes_player_id ON player_derived_attributes(player_id);

-- Create a view for easy access to player profiles with all attributes
CREATE OR REPLACE VIEW player_full_profiles AS
SELECT 
    p.id,
    p.friendly_name,
    p.average_attack_rating,
    p.average_defense_rating,
    p.average_game_iq_rating,
    COALESCE(pda.pace_rating, 0.35) as pace_rating,
    COALESCE(pda.shooting_rating, 0.35) as shooting_rating,
    COALESCE(pda.passing_rating, 0.35) as passing_rating,
    COALESCE(pda.dribbling_rating, 0.35) as dribbling_rating,
    COALESCE(pda.defending_rating, 0.35) as defending_rating,
    COALESCE(pda.physical_rating, 0.35) as physical_rating,
    COALESCE(pda.total_ratings_count, 0) as playstyle_ratings_count
FROM players p
LEFT JOIN player_derived_attributes pda ON p.id = pda.player_id;