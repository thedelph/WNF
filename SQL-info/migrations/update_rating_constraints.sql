-- Drop existing rating check constraints
ALTER TABLE player_ratings DROP CONSTRAINT IF EXISTS player_ratings_attack_rating_check;
ALTER TABLE player_ratings DROP CONSTRAINT IF EXISTS player_ratings_defense_rating_check;

-- Add new constraints that match the 0-10 scale
ALTER TABLE player_ratings 
    ADD CONSTRAINT player_ratings_attack_rating_check 
    CHECK (attack_rating >= 0 AND attack_rating <= 10),
    ADD CONSTRAINT player_ratings_defense_rating_check 
    CHECK (defense_rating >= 0 AND defense_rating <= 10);
