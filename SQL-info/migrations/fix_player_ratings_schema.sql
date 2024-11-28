-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS check_rating_trigger ON player_ratings;
DROP FUNCTION IF EXISTS check_rating();

-- Drop and recreate the table with proper constraints
DROP TABLE IF EXISTS player_ratings CASCADE;

CREATE TABLE player_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rater_id UUID NOT NULL REFERENCES players(id),
    rated_player_id UUID NOT NULL REFERENCES players(id),
    attack_rating NUMERIC CHECK (attack_rating >= 0 AND attack_rating <= 5),
    defense_rating NUMERIC CHECK (defense_rating >= 0 AND defense_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cannot_rate_self CHECK (rater_id != rated_player_id),
    CONSTRAINT unique_rating_pair UNIQUE (rater_id, rated_player_id)
);

-- Add RLS policies
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can rate others they've played with"
ON player_ratings FOR ALL
TO public
USING (
    EXISTS (
        SELECT 1 FROM players
        WHERE players.id = player_ratings.rater_id
        AND players.user_id = auth.uid()
    )
);

CREATE POLICY "View ratings policy"
ON player_ratings FOR SELECT
TO public
USING (
    (
        -- Allow admins to view all ratings
        EXISTS (
            SELECT 1 FROM players p
            JOIN admin_roles ar ON p.id = ar.player_id
            WHERE p.user_id = auth.uid()
        )
    ) OR (
        -- Allow players to view ratings where they are either the rater or rated player
        EXISTS (
            SELECT 1 FROM players
            WHERE players.user_id = auth.uid()
            AND (
                players.id = player_ratings.rater_id OR
                players.id = player_ratings.rated_player_id
            )
        )
    )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_ratings_timestamp
    BEFORE UPDATE ON player_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
