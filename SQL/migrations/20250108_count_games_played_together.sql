-- Create function to count games played together
CREATE OR REPLACE FUNCTION count_games_played_together(player_one_id UUID, player_two_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT gr1.game_id)
    FROM game_registrations gr1
    INNER JOIN game_registrations gr2 ON gr1.game_id = gr2.game_id
    INNER JOIN games g ON gr1.game_id = g.id
    WHERE gr1.player_id = player_one_id
    AND gr2.player_id = player_two_id
    AND g.completed = true
  );
END;
$$ LANGUAGE plpgsql;
