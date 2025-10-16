-- =====================================================
-- Update game_registration RPC to handle using_token flag
-- =====================================================
-- This migration updates the update_game_registration function
-- to also update the using_token flag when token forgiveness occurs

CREATE OR REPLACE FUNCTION update_game_registration(
    p_game_id uuid,
    p_player_id uuid,
    p_status text,
    p_selection_method text,
    p_using_token boolean DEFAULT NULL,
    p_bypass_permission boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Check permissions only if not bypassing
  IF NOT p_bypass_permission THEN
    SELECT EXISTS (
      SELECT 1
      FROM players p
      JOIN admin_roles ar ON ar.player_id = p.id
      JOIN admin_permissions ap ON ap.admin_role_id = ar.id
      WHERE p.user_id = auth.uid()
      AND ap.permission = 'manage_games'
    ) INTO v_has_permission;

    IF NOT v_has_permission THEN
      RAISE EXCEPTION 'User does not have permission to update game registrations';
    END IF;
  END IF;

  -- Update game registration
  -- Only update using_token if it was provided (not NULL)
  IF p_using_token IS NOT NULL THEN
    UPDATE game_registrations
    SET
      status = p_status,
      selection_method = p_selection_method,
      using_token = p_using_token
    WHERE
      game_id = p_game_id
      AND player_id = p_player_id;
  ELSE
    UPDATE game_registrations
    SET
      status = p_status,
      selection_method = p_selection_method
    WHERE
      game_id = p_game_id
      AND player_id = p_player_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'status', p_status,
    'selection_method', p_selection_method,
    'using_token', p_using_token
  );
END;
$$;

COMMENT ON FUNCTION update_game_registration IS
'Updates game registration including using_token flag for token forgiveness handling';
