-- Create player_ratings table
CREATE TABLE player_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rater_id UUID NOT NULL REFERENCES players(id),
    rated_player_id UUID NOT NULL REFERENCES players(id),
    attack_rating NUMERIC(3,1) CHECK (attack_rating >= 0 AND attack_rating <= 10),
    defense_rating NUMERIC(3,1) CHECK (defense_rating >= 0 AND defense_rating <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_rating UNIQUE (rater_id, rated_player_id),
    CONSTRAINT cannot_rate_self CHECK (rater_id != rated_player_id)
);

-- Create function to check if players have played enough games together
CREATE OR REPLACE FUNCTION check_games_played_together(player1_id UUID, player2_id UUID)
RETURNS INTEGER AS $$
DECLARE
    games_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO games_count
    FROM game_selections gs1
    JOIN game_selections gs2 ON gs1.game_id = gs2.game_id
    WHERE gs1.player_id = player1_id 
    AND gs2.player_id = player2_id
    AND gs1.game_id IN (
        SELECT id FROM games WHERE completed = true
    );
    RETURN games_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce 5 games played rule
CREATE OR REPLACE FUNCTION check_rating_eligibility()
RETURNS TRIGGER AS $$
BEGIN
    IF check_games_played_together(NEW.rater_id, NEW.rated_player_id) < 5 THEN
        RAISE EXCEPTION 'Players must have played at least 5 games together before rating';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_rating_eligibility
BEFORE INSERT OR UPDATE ON player_ratings
FOR EACH ROW
EXECUTE FUNCTION check_rating_eligibility();

-- Add RLS policies
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

-- Policy for inserting/updating ratings
CREATE POLICY "Players can rate others they've played with"
ON player_ratings
FOR ALL
USING (
    auth.uid() = rater_id
);

-- Policy for viewing ratings (admin only)
CREATE POLICY "Only admins can view all ratings"
ON player_ratings
FOR SELECT
USING (
    auth.uid() IN (
        SELECT p.id 
        FROM players p
        JOIN admin_roles ar ON p.id = ar.player_id
    )
);
