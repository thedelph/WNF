-- Drop all functions to ensure clean recreation
DROP FUNCTION IF EXISTS create_slot_offers_for_game(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS create_slot_offers_for_game(UUID, UUID);
DROP FUNCTION IF EXISTS create_slot_offers_for_game(UUID);
DROP FUNCTION IF EXISTS create_slot_offers_for_game(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_reserve_players_by_xp(UUID);
DROP FUNCTION IF EXISTS get_next_slot_offer_players(UUID, NUMERIC);
DROP FUNCTION IF EXISTS handle_slot_offer_response(UUID, TEXT);
DROP FUNCTION IF EXISTS handle_slot_offer_response(UUID, slot_offer_status);

-- Create the get_reserve_players_by_xp function
CREATE OR REPLACE FUNCTION get_reserve_players_by_xp(p_game_id UUID)
RETURNS TABLE (
  player_id UUID,
  xp NUMERIC,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH player_stats AS (
    SELECT 
      p.id,
      p.caps,
      p.active_bonuses,
      p.active_penalties,
      p.current_streak,
      gr.created_at
    FROM game_registrations gr
    INNER JOIN players p ON p.id = gr.player_id
    WHERE gr.game_id = p_game_id
    AND gr.status = 'reserve'
  ),
  player_xp AS (
    SELECT 
      ps.id,
      ps.created_at,
      -- Calculate XP using the updated formula without dropout_penalties
      (ps.caps * 
        GREATEST(
          (10 + 
           COALESCE(ps.active_bonuses, 0) - 
           COALESCE(ps.active_penalties, 0) + 
           COALESCE(ps.current_streak, 0)
          ), 
          1
        )
      )::NUMERIC as xp
    FROM player_stats ps
  )
  SELECT 
    px.id as player_id,
    px.xp,
    ROW_NUMBER() OVER (ORDER BY px.xp DESC, px.created_at ASC)::INTEGER as rank
  FROM player_xp px;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the get_next_slot_offer_players function
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
  v_total_hours NUMERIC;
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

  -- Get number of pending offers
  SELECT COUNT(*)::INTEGER INTO v_pending_offers
  FROM slot_offers
  WHERE game_id = p_game_id AND status = 'pending';

  -- Adjust available slots by pending offers
  v_available_slots := v_available_slots - v_pending_offers;

  RAISE NOTICE 'Total reserve players: %, Available slots: %, Pending offers: %', 
    v_total_players, v_available_slots, v_pending_offers;

  -- If no slots available, return empty result
  IF v_available_slots <= 0 THEN
    RAISE NOTICE 'No slots available after accounting for pending offers, returning empty result';
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
      AND so.status IN ('pending', 'accepted')
    )
    LIMIT v_available_slots;
    RETURN;
  END IF;

  -- Get the time of the first dropout for this game
  SELECT MIN(created_at) INTO v_first_dropout_time
  FROM game_registrations
  WHERE game_id = p_game_id AND status = 'dropped_out';

  -- Calculate total hours from first dropout to game day
  IF v_first_dropout_time IS NOT NULL THEN
    v_total_hours := EXTRACT(EPOCH FROM (
      DATE_TRUNC('day', (SELECT date FROM games WHERE id = p_game_id)) - 
      v_first_dropout_time
    )) / 3600;

    -- Calculate hours elapsed since first dropout
    v_hours_elapsed := v_total_hours - p_hours_until_game;

    RAISE NOTICE 'First dropout time: %, Total hours: %, Hours elapsed: %', 
      v_first_dropout_time, v_total_hours, v_hours_elapsed;

    -- Calculate how many players should have offers
    v_players_to_offer := GREATEST(
      1,
      LEAST(
        v_available_slots,
        1 + FLOOR((v_hours_elapsed / GREATEST(v_total_hours, 1)) * (v_total_players - 1))::INTEGER
      )
    );
  ELSE
    -- If no dropouts yet, offer to one player
    v_players_to_offer := 1;
  END IF;

  RAISE NOTICE 'Players to offer: %', v_players_to_offer;

  -- Return the top N players by XP who don't already have any offers
  RETURN QUERY
  SELECT rp.player_id
  FROM get_reserve_players_by_xp(p_game_id) rp
  WHERE NOT EXISTS (
    SELECT 1 
    FROM slot_offers so 
    WHERE so.game_id = p_game_id 
    AND so.player_id = rp.player_id
  )
  LIMIT v_players_to_offer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the create_slot_offers_for_game function
CREATE OR REPLACE FUNCTION create_slot_offers_for_game(
  p_game_id UUID,
  p_admin_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_game_date TIMESTAMP WITH TIME ZONE;
  v_hours_until_game NUMERIC;
  v_game_number INTEGER;
  v_offers_created INTEGER := 0;
  v_eligible_player UUID;
  v_total_dropouts INTEGER;
  v_total_offers INTEGER;
BEGIN
  -- Get game details
  SELECT 
    g.date,
    COUNT(g2.*) + 1 INTO v_game_date, v_game_number
  FROM games g
  LEFT JOIN games g2 ON g2.date < g.date OR (g2.date = g.date AND g2.id < g.id)
  WHERE g.id = p_game_id
  GROUP BY g.date;

  -- Calculate hours until game day (00:00)
  v_hours_until_game := 
    EXTRACT(EPOCH FROM (DATE_TRUNC('day', v_game_date) - NOW())) / 3600;
    
  RAISE NOTICE 'Creating slot offers for game % (WNF #%)', p_game_id, v_game_number;
  RAISE NOTICE 'Hours until game: %', v_hours_until_game;
  RAISE NOTICE 'Game date: %', v_game_date;

  -- Get number of dropouts and existing offers
  SELECT 
    COUNT(*) FILTER (WHERE status = 'dropped_out'),
    COUNT(*) FILTER (WHERE status IN ('pending', 'accepted'))
  INTO v_total_dropouts, v_total_offers
  FROM game_registrations gr
  WHERE game_id = p_game_id;
  
  RAISE NOTICE 'Total dropouts: %, Total offers: %', v_total_dropouts, v_total_offers;

  -- Get eligible players
  FOR v_eligible_player IN 
    SELECT player_id 
    FROM get_next_slot_offer_players(p_game_id, v_hours_until_game)
  LOOP
    RAISE NOTICE 'Processing eligible player: %', v_eligible_player;
    
    -- Create slot offer if one doesn't exist
    INSERT INTO slot_offers (
      game_id,
      player_id,
      status,
      offered_at
    )
    SELECT 
      p_game_id,
      v_eligible_player,
      'pending',
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 
      FROM slot_offers 
      WHERE game_id = p_game_id 
      AND player_id = v_eligible_player
    );

    -- If we inserted a new offer, create a notification
    IF FOUND THEN
      v_offers_created := v_offers_created + 1;
      RAISE NOTICE 'Created new slot offer for player %', v_eligible_player;
      
      INSERT INTO notifications (
        player_id,
        type,
        message,
        metadata
      ) VALUES (
        v_eligible_player,
        'slot_offer',
        'A spot has opened up in WNF #' || v_game_number || ' on ' || 
        TO_CHAR(v_game_date::DATE, 'DD/MM/YYYY') || '. Would you like to join?',
        jsonb_build_object(
          'game_id', p_game_id,
          'action', 'slot_offer'
        )
      );
    ELSE
      RAISE NOTICE 'Player % already has an offer', v_eligible_player;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total offers created: %', v_offers_created;

  -- Send notification to the admin who initiated the dropout
  IF p_admin_id IS NOT NULL AND v_offers_created > 0 THEN
    INSERT INTO notifications (
      player_id,
      type,
      message,
      metadata
    ) VALUES (
      p_admin_id,
      'system_message',
      'Created ' || v_offers_created || ' slot offers for WNF #' || v_game_number || ' on ' || 
      TO_CHAR(v_game_date::DATE, 'DD/MM/YYYY'),
      jsonb_build_object(
        'game_id', p_game_id,
        'action', 'slot_offers_created',
        'offers_created', v_offers_created,
        'game_number', v_game_number,
        'game_date', v_game_date
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the handle_slot_offer_response function
CREATE OR REPLACE FUNCTION handle_slot_offer_response(
  p_offer_id UUID,
  p_status TEXT
) RETURNS void AS $$
DECLARE
  v_game_id UUID;
  v_player_id UUID;
  v_game_number INTEGER;
  v_game_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the offer details
  SELECT 
    game_id,
    player_id,
    g.date,
    COUNT(g2.*) + 1 INTO v_game_id, v_player_id, v_game_date, v_game_number
  FROM slot_offers so
  JOIN games g ON g.id = so.game_id
  LEFT JOIN games g2 ON g2.date < g.date OR (g2.date = g.date AND g2.id < g.id)
  WHERE so.id = p_offer_id
  GROUP BY so.game_id, so.player_id, g.date;

  -- Update the slot offer status
  UPDATE slot_offers
  SET 
    status = p_status::slot_offer_status,
    responded_at = NOW()
  WHERE id = p_offer_id;

  -- If accepted, update game registration and create notification
  IF p_status = 'accepted' THEN
    -- Update the player's registration status
    UPDATE game_registrations
    SET status = 'selected'
    WHERE game_id = v_game_id AND player_id = v_player_id;

    -- Create a notification for the player
    INSERT INTO notifications (
      player_id,
      type,
      message,
      metadata
    ) VALUES (
      v_player_id,
      'slot_offer',
      'You have been added to WNF #' || v_game_number || ' on ' || 
      TO_CHAR(v_game_date::DATE, 'DD/MM/YYYY'),
      jsonb_build_object(
        'game_id', v_game_id,
        'action', 'slot_offer_accepted'
      )
    );
  END IF;

  -- If declined, create a notification and create new slot offers
  IF p_status = 'declined' THEN
    -- Log for debugging
    RAISE NOTICE 'Slot offer % declined for game %', p_offer_id, v_game_id;
    
    INSERT INTO notifications (
      player_id,
      type,
      message,
      metadata
    ) VALUES (
      v_player_id,
      'system_message',
      'You have declined the slot offer for WNF #' || v_game_number || ' on ' || 
      TO_CHAR(v_game_date::DATE, 'DD/MM/YYYY'),
      jsonb_build_object(
        'game_id', v_game_id,
        'action', 'slot_offer_declined'
      )
    );

    -- Create new slot offers after declining
    RAISE NOTICE 'Creating new slot offers for game %', v_game_id;
    PERFORM create_slot_offers_for_game(v_game_id, NULL::UUID);
    RAISE NOTICE 'Finished creating new slot offers';
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
