-- Create slot_offer_status type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE slot_offer_status AS ENUM ('pending', 'accepted', 'declined', 'voided');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update get_next_slot_offer_players function to implement dynamic offer distribution
CREATE OR REPLACE FUNCTION get_next_slot_offer_players(
  p_game_id UUID,
  p_hours_until_game NUMERIC
) RETURNS TABLE (
  player_id UUID
) AS $$
DECLARE
  v_total_players INTEGER;
  v_available_slots INTEGER;
  v_pending_offers INTEGER;
  v_first_dropout_time TIMESTAMP WITH TIME ZONE;
  v_game_date TIMESTAMP WITH TIME ZONE;
  v_total_hours NUMERIC;
  v_hours_per_player NUMERIC;
  v_hours_elapsed NUMERIC;
  v_players_to_offer INTEGER;
BEGIN
  RAISE NOTICE 'Getting next slot offer players for game % (hours until game: %)', p_game_id, p_hours_until_game;

  -- Get total number of reserve players
  SELECT COUNT(*)::INTEGER INTO v_total_players
  FROM game_registrations
  WHERE game_id = p_game_id AND status = 'reserve';

  -- Get number of available slots (number of dropouts)
  SELECT COUNT(*)::INTEGER INTO v_available_slots
  FROM game_registrations
  WHERE game_id = p_game_id AND status = 'dropped_out';

  -- Get number of accepted offers
  SELECT COUNT(*)::INTEGER INTO v_pending_offers
  FROM slot_offers
  WHERE game_id = p_game_id AND status = 'accepted';

  -- Adjust available slots by accepted offers
  v_available_slots := v_available_slots - v_pending_offers;

  RAISE NOTICE 'Total reserve players: %, Available slots: %, Accepted offers: %', 
    v_total_players, v_available_slots, v_pending_offers;

  -- If no slots available, return empty result
  IF v_available_slots <= 0 THEN
    RAISE NOTICE 'No slots available after accounting for accepted offers, returning empty result';
    RETURN;
  END IF;

  -- If no reserve players, return empty result
  IF v_total_players = 0 THEN
    RAISE NOTICE 'No reserve players available, returning empty result';
    RETURN;
  END IF;

  -- If it's game day (00:00 or later), return all players
  IF p_hours_until_game <= 0 THEN
    RAISE NOTICE 'Game day has arrived, returning all eligible players';
    RETURN QUERY
    SELECT rp.player_id
    FROM get_reserve_players_by_xp(p_game_id) rp
    WHERE NOT EXISTS (
      SELECT 1 
      FROM slot_offers so 
      WHERE so.game_id = p_game_id 
      AND so.player_id = rp.player_id
      AND so.status = 'accepted'
    )
    LIMIT v_available_slots;
    RETURN;
  END IF;

  -- Get the time of the first dropout for this game
  SELECT MIN(created_at) INTO v_first_dropout_time
  FROM game_registrations
  WHERE game_id = p_game_id AND status = 'dropped_out';

  -- Get the game date and set to midnight
  SELECT DATE_TRUNC('day', date) INTO v_game_date
  FROM games 
  WHERE id = p_game_id;

  -- Calculate total hours from first dropout to game day
  IF v_first_dropout_time IS NOT NULL THEN
    -- Calculate total time window in hours
    v_total_hours := EXTRACT(EPOCH FROM (v_game_date - v_first_dropout_time)) / 3600;
    
    -- Calculate hours per player
    v_hours_per_player := v_total_hours / GREATEST(v_total_players, 1);

    -- Calculate hours elapsed since first dropout
    v_hours_elapsed := EXTRACT(EPOCH FROM (NOW() - v_first_dropout_time)) / 3600;

    RAISE NOTICE 'Time calculations: First dropout: %, Game day: %, Total hours: %, Hours per player: %, Hours elapsed: %', 
      v_first_dropout_time,
      v_game_date,
      v_total_hours,
      v_hours_per_player,
      v_hours_elapsed;

    -- Calculate how many players should have offers based on elapsed time
    -- This creates a linear distribution of offers over time
    v_players_to_offer := LEAST(
      FLOOR(v_hours_elapsed / v_hours_per_player),
      v_total_players
    );

    RAISE NOTICE 'Players to offer: %', v_players_to_offer;
  ELSE
    -- If no dropouts yet, offer to one player
    v_players_to_offer := 1;
  END IF;

  -- Return the top N players by XP who don't have accepted offers
  RETURN QUERY
  SELECT rp.player_id
  FROM get_reserve_players_by_xp(p_game_id) rp
  WHERE NOT EXISTS (
    SELECT 1 
    FROM slot_offers so 
    WHERE so.game_id = p_game_id 
    AND so.player_id = rp.player_id
    AND (so.status = 'accepted' OR so.status = 'declined')  -- Don't offer to players who have declined
  )
  ORDER BY rp.xp DESC, rp.rank ASC
  LIMIT v_players_to_offer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_slot_offer_response to handle offer acceptance properly
CREATE OR REPLACE FUNCTION handle_slot_offer_response_text(
  p_game_id UUID,
  p_player_id UUID,
  p_response TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_offer_id UUID;
  v_current_offer_status TEXT;
  v_message TEXT;
BEGIN
  -- Get the current offer status
  SELECT id, status INTO v_current_offer_id, v_current_offer_status
  FROM slot_offers
  WHERE game_id = p_game_id 
  AND player_id = p_player_id 
  AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no pending offer exists, return error
  IF v_current_offer_id IS NULL THEN
    RETURN 'No pending offer found';
  END IF;

  -- Update the current offer based on response
  UPDATE slot_offers
  SET 
    status = CASE 
      WHEN p_response = 'accept' THEN 'accepted'
      WHEN p_response = 'decline' THEN 'declined'
      ELSE status
    END,
    responded_at = NOW()
  WHERE id = v_current_offer_id;

  -- If offer was declined, create offers for next eligible players
  IF p_response = 'decline' THEN
    -- Update game registration to mark as declined
    UPDATE game_registrations
    SET has_declined = true
    WHERE game_id = p_game_id AND player_id = p_player_id;

    -- Call create_slot_offers to generate new offers
    PERFORM create_slot_offers(p_game_id);
    
    v_message := 'Offer declined. New offers will be created for eligible players.';
  ELSIF p_response = 'accept' THEN
    -- Update game registration status
    UPDATE game_registrations 
    SET status = 'confirmed'
    WHERE game_id = p_game_id AND player_id = p_player_id;

    -- Update any other pending offers to expired
    UPDATE slot_offers
    SET status = 'expired'
    WHERE game_id = p_game_id 
    AND status = 'pending'
    AND player_id != p_player_id;

    v_message := 'Offer accepted. Your spot has been confirmed.';
  END IF;

  -- Send notification to admins about the response
  INSERT INTO notifications (
    player_id,
    type,
    message,
    metadata
  )
  SELECT DISTINCT
    ar.player_id,
    'system_message',
    CASE 
      WHEN p_response = 'accept' THEN 
        (SELECT username FROM players WHERE id = p_player_id) || ' has accepted a slot offer for WNF #' || 
        (SELECT COUNT(*) + 1 
         FROM games g2 
         WHERE g2.date < (SELECT date FROM games WHERE id = p_game_id) 
         OR (g2.date = (SELECT date FROM games WHERE id = p_game_id) AND g2.id < p_game_id))
      WHEN p_response = 'decline' THEN 
        (SELECT username FROM players WHERE id = p_player_id) || ' has declined a slot offer for WNF #' ||
        (SELECT COUNT(*) + 1 
         FROM games g2 
         WHERE g2.date < (SELECT date FROM games WHERE id = p_game_id) 
         OR (g2.date = (SELECT date FROM games WHERE id = p_game_id) AND g2.id < p_game_id))
    END,
    jsonb_build_object(
      'game_id', p_game_id,
      'action', CASE 
        WHEN p_response = 'accept' THEN 'slot_offer_accepted'
        WHEN p_response = 'decline' THEN 'slot_offer_declined'
      END,
      'player_id', p_player_id,
      'game_number', (
        SELECT COUNT(*) + 1 
        FROM games g2 
        WHERE g2.date < (SELECT date FROM games WHERE id = p_game_id) 
        OR (g2.date = (SELECT date FROM games WHERE id = p_game_id) AND g2.id < p_game_id)
      )
    )
  FROM admin_roles ar
  JOIN admin_permissions ap ON ap.admin_role_id = ar.id
  WHERE ap.permission = 'manage_games';

  -- Also notify admins about new offers being created if this was a decline
  IF p_response = 'decline' THEN
    INSERT INTO notifications (
      player_id,
      type,
      message,
      metadata
    )
    SELECT DISTINCT
      ar.player_id,
      'system_message',
      'Creating new slot offers after ' || (SELECT username FROM players WHERE id = p_player_id) || ' declined',
      jsonb_build_object(
        'game_id', p_game_id,
        'action', 'creating_new_offers',
        'declined_player_id', p_player_id
      )
    FROM admin_roles ar
    JOIN admin_permissions ap ON ap.admin_role_id = ar.id
    WHERE ap.permission = 'manage_games';
  END IF;

  RETURN v_message;
END;
$$;

-- Create slot_offers function to create new offers
CREATE OR REPLACE FUNCTION create_slot_offers(p_game_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_players INTEGER;
  v_available_slots INTEGER;
  v_pending_offers INTEGER;
  v_first_dropout_time TIMESTAMP WITH TIME ZONE;
  v_game_date TIMESTAMP WITH TIME ZONE;
  v_total_hours NUMERIC;
  v_hours_per_player NUMERIC;
  v_hours_elapsed NUMERIC;
  v_players_to_offer INTEGER;
BEGIN
  -- Get total number of reserve players
  SELECT COUNT(*)
  INTO v_total_players
  FROM game_registrations gr
  WHERE gr.game_id = p_game_id
  AND gr.status = 'reserve'
  AND NOT gr.has_declined; -- Exclude players who have declined

  -- Get number of available slots (dropouts)
  SELECT COUNT(*)
  INTO v_available_slots
  FROM game_registrations gr
  WHERE gr.game_id = p_game_id
  AND gr.status = 'dropped_out';

  -- Get number of pending offers
  SELECT COUNT(*)
  INTO v_pending_offers
  FROM slot_offers so
  WHERE so.game_id = p_game_id
  AND so.status = 'pending';

  -- If no slots available or already have enough pending offers, exit
  IF v_available_slots = 0 OR v_pending_offers >= v_available_slots THEN
    RETURN;
  END IF;

  -- Get the time of the first dropout for this game
  SELECT MIN(created_at) INTO v_first_dropout_time
  FROM game_registrations
  WHERE game_id = p_game_id AND status = 'dropped_out';

  -- Get the game date and set to midnight
  SELECT DATE_TRUNC('day', date) INTO v_game_date
  FROM games 
  WHERE id = p_game_id;

  -- Calculate total hours from first dropout to game day
  IF v_first_dropout_time IS NOT NULL THEN
    -- Calculate total time window in hours
    v_total_hours := EXTRACT(EPOCH FROM (v_game_date - v_first_dropout_time)) / 3600;
    
    -- Calculate hours per player
    v_hours_per_player := v_total_hours / GREATEST(v_total_players, 1);

    -- Calculate hours elapsed since first dropout
    v_hours_elapsed := EXTRACT(EPOCH FROM (NOW() - v_first_dropout_time)) / 3600;

    -- Calculate how many players should have offers based on elapsed time
    v_players_to_offer := LEAST(
      FLOOR(v_hours_elapsed / v_hours_per_player) + 1, -- Add 1 to ensure at least one offer
      v_total_players
    );
  ELSE
    -- If no dropouts yet, don't create any offers
    RETURN;
  END IF;

  -- Create offers for eligible players
  WITH ranked_players AS (
    SELECT 
      gr.player_id,
      ROW_NUMBER() OVER (ORDER BY gr.created_at ASC) as rank
    FROM game_registrations gr
    LEFT JOIN slot_offers so ON 
      so.game_id = gr.game_id 
      AND so.player_id = gr.player_id
      AND so.status = 'pending' -- Only check for pending offers
    WHERE gr.game_id = p_game_id
    AND gr.status = 'reserve'
    AND NOT gr.has_declined -- Exclude players who have declined
    AND so.id IS NULL -- Only players without pending offers
  )
  INSERT INTO slot_offers (game_id, player_id, status, offered_at)
  SELECT 
    p_game_id,
    rp.player_id,
    'pending',
    NOW()
  FROM ranked_players rp
  WHERE rp.rank <= LEAST(
    v_players_to_offer,
    v_available_slots - v_pending_offers -- Only create offers up to available slots
  )
  AND NOT EXISTS ( -- Double check no existing pending offers
    SELECT 1 FROM slot_offers so2
    WHERE so2.game_id = p_game_id
    AND so2.player_id = rp.player_id
    AND so2.status = 'pending'
  );

  -- Create notifications for new offers
  INSERT INTO notifications (
    player_id,
    type,
    message,
    metadata
  )
  SELECT 
    so.player_id,
    'slot_offer',
    'A spot has opened up in the game. Would you like to play?',
    jsonb_build_object(
      'game_id', p_game_id,
      'action', 'new_slot_offer'
    )
  FROM slot_offers so
  WHERE so.game_id = p_game_id
  AND so.status = 'pending'
  AND so.offered_at >= NOW() - INTERVAL '1 minute'; -- Only notify for newly created offers
END;
$$;

-- Drop the old text version if it exists
DROP FUNCTION IF EXISTS handle_slot_offer_response(UUID, TEXT);
