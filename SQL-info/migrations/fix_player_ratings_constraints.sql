-- Drop the problematic unique rating constraints
ALTER TABLE player_ratings DROP CONSTRAINT IF EXISTS unique_rating;
DROP INDEX IF EXISTS unique_rating;

-- Add a new unique constraint that ensures one rating per rater-rated pair
ALTER TABLE player_ratings ADD CONSTRAINT unique_rating_pair UNIQUE (rater_id, rated_player_id);

-- Drop and recreate the cannot_rate_self constraint to make it clearer
ALTER TABLE player_ratings DROP CONSTRAINT IF EXISTS cannot_rate_self;
ALTER TABLE player_ratings ADD CONSTRAINT cannot_rate_self CHECK (rater_id != rated_player_id);
