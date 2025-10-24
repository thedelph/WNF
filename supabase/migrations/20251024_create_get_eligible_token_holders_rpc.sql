-- Create RPC function to get eligible token holders not registered in a game
-- This function is more efficient than client-side loops and properly handles eligibility checks

CREATE OR REPLACE FUNCTION get_eligible_token_holders_not_in_game(p_game_id UUID)
RETURNS TABLE (
  player_id UUID,
  friendly_name TEXT,
  xp INTEGER,
  token_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.player_id,
    ps.friendly_name,
    ps.xp,
    pt.id as token_id
  FROM player_tokens pt
  JOIN player_stats ps ON pt.player_id = ps.id
  WHERE pt.used_at IS NULL
    AND (pt.expires_at IS NULL OR pt.expires_at > NOW())
    AND pt.player_id NOT IN (
      SELECT gr.player_id
      FROM game_registrations gr
      WHERE gr.game_id = p_game_id
    )
    AND check_token_eligibility(pt.player_id) = TRUE
  ORDER BY ps.xp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_eligible_token_holders_not_in_game(UUID) TO authenticated;

COMMENT ON FUNCTION get_eligible_token_holders_not_in_game IS
'Returns all eligible players with active priority tokens who are not registered for the specified game. Used by the selection odds calculator to determine potential threats to merit-based selection.';
