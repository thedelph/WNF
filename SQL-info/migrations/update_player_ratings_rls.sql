-- Drop existing RLS policies for player_ratings
DROP POLICY IF EXISTS "Players can rate others they've played with" ON player_ratings;
DROP POLICY IF EXISTS "Only admins can view all ratings" ON player_ratings;

-- Create new RLS policies with correct auth checks
CREATE POLICY "Players can rate others they've played with"
ON player_ratings
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = player_ratings.rater_id
    AND players.user_id = auth.uid()
  )
);

-- Allow viewing ratings for admins and for players viewing their own ratings
CREATE POLICY "View ratings policy"
ON player_ratings
FOR SELECT
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
