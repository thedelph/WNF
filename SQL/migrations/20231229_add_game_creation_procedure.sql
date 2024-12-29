-- Create a function to handle game creation with proper status casting
CREATE OR REPLACE FUNCTION create_game_with_status(
    p_date timestamp with time zone,
    p_reg_start timestamp with time zone,
    p_reg_end timestamp with time zone,
    p_max_players integer DEFAULT 18,
    p_random_slots integer DEFAULT 2
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_game_id uuid;
    v_status text := 'created';
BEGIN
    -- Validate dates
    IF p_reg_start >= p_reg_end THEN
        RAISE EXCEPTION 'Registration start must be before registration end';
    END IF;
    
    IF p_reg_end > p_date THEN
        RAISE EXCEPTION 'Registration must end before game starts';
    END IF;

    -- Validate status is in allowed values
    IF NOT (v_status = ANY(ARRAY['created', 'registration_open', 'teams_announced', 'pending_completion', 'completed']::text[])) THEN
        RAISE EXCEPTION 'Invalid status value: %', v_status;
    END IF;

    -- Insert the game with explicit casting of status
    EXECUTE 'INSERT INTO games (
        date,
        registration_window_start,
        registration_window_end,
        status,
        needs_completion,
        is_historical,
        teams_announced,
        completed,
        random_slots,
        max_players,
        score_blue,
        score_orange,
        outcome
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id'
    INTO v_game_id
    USING 
        p_date,
        p_reg_start,
        p_reg_end,
        v_status,
        true,
        false,
        false,
        false,
        p_random_slots,
        p_max_players,
        NULL,
        NULL,
        NULL;

    IF v_game_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create game';
    END IF;

    RETURN v_game_id;
END;
$$;
