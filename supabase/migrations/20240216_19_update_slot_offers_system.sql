-- Remove expires_at column from slot_offers
ALTER TABLE slot_offers DROP COLUMN IF EXISTS expires_at;

-- Add a function to get reserve players ordered by XP
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
      p.dropout_penalties,
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
      -- Calculate XP using the same formula as xpCalculations.ts
      (ps.caps * 
        GREATEST(
          (10 + 
           COALESCE(ps.active_bonuses, 0) - 
           COALESCE(ps.active_penalties, 0) + 
           COALESCE(ps.current_streak, 0) - 
           (COALESCE(ps.dropout_penalties, 0) * 5)
          ), 
          1
        )
      )::NUMERIC as xp
    FROM player_stats ps
  )
  SELECT 
    px.id as player_id,
    px.xp,
    ROW_NUMBER() OVER (ORDER BY px.xp DESC, px.created_at ASC) as rank
  FROM player_xp px;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the next players to offer slots to
CREATE OR REPLACE FUNCTION get_next_slot_offer_players(
  p_game_id UUID,
  p_hours_until_game NUMERIC
) RETURNS TABLE (
  player_id UUID
) AS $$
DECLARE
  v_total_players INTEGER;
  v_players_to_offer INTEGER;
BEGIN
  -- Get total number of reserve players
  SELECT COUNT(*) INTO v_total_players
  FROM game_registrations
  WHERE game_id = p_game_id AND status = 'reserve';

  -- If it's game day (00:00 or later), return all players
  IF p_hours_until_game <= 0 THEN
    RETURN QUERY
    SELECT rp.player_id
    FROM get_reserve_players_by_xp(p_game_id) rp;
    RETURN;
  END IF;

  -- Calculate how many players should have offers based on time
  -- Linear progression from 1 player to all players
  v_players_to_offer := GREATEST(
    1,
    LEAST(
      v_total_players,
      CEIL(v_total_players * (1 - (p_hours_until_game / 48)))::INTEGER
    )
  );

  -- Return the top N players by XP
  RETURN QUERY
  SELECT rp.player_id
  FROM get_reserve_players_by_xp(p_game_id) rp
  WHERE rp.rank <= v_players_to_offer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all versions of create_slot_offers_for_game function
DROP FUNCTION IF EXISTS create_slot_offers_for_game(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS create_slot_offers_for_game(UUID, UUID);

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

  -- Get eligible players
  FOR v_eligible_player IN 
    SELECT player_id 
    FROM get_next_slot_offer_players(p_game_id, v_hours_until_game)
  LOOP
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
    END IF;
  END LOOP;

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

-- Update the slot_offers table to improve query performance
CREATE INDEX IF NOT EXISTS idx_slot_offers_game_player ON slot_offers(game_id, player_id);

-- Create a function to handle slot offer responses
CREATE OR REPLACE FUNCTION handle_slot_offer_response(
  p_offer_id UUID,
  p_status TEXT
) RETURNS void AS $$
DECLARE
  v_game_id UUID;
  v_player_id UUID;
BEGIN
  -- Get the offer details
  SELECT game_id, player_id INTO v_game_id, v_player_id
  FROM slot_offers
  WHERE id = p_offer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot offer not found';
  END IF;

  -- If accepting the offer
  IF p_status = 'accepted' THEN
    -- Update game registration to selected
    UPDATE game_registrations
    SET status = 'selected'
    WHERE game_id = v_game_id
    AND player_id = v_player_id;

    -- Mark all other offers for this game as void
    UPDATE slot_offers
    SET status = 'void'
    WHERE game_id = v_game_id
    AND id != p_offer_id;

    -- Create notifications for other players
    INSERT INTO notifications (
      player_id,
      type,
      message,
      metadata
    )
    SELECT 
      so.player_id,
      'system_message',
      'The slot you were offered has been filled by another player.',
      jsonb_build_object(
        'game_id', v_game_id,
        'action', 'slot_filled'
      )
    FROM slot_offers so
    WHERE so.game_id = v_game_id
    AND so.id != p_offer_id
    AND so.status = 'pending';
  END IF;

  -- Update the offer status
  UPDATE slot_offers
  SET 
    status = p_status,
    responded_at = NOW()
  WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
