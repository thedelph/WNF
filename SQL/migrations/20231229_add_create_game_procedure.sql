-- Create a function to handle game creation with proper status handling
CREATE OR REPLACE FUNCTION create_new_game(
    p_date timestamp with time zone,
    p_registration_window_start timestamp with time zone,
    p_registration_window_end timestamp with time zone,
    p_max_players integer DEFAULT 18,
    p_random_slots integer DEFAULT 2
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_game_id uuid;
BEGIN
    -- Validate dates
    IF p_registration_window_start >= p_registration_window_end THEN
        RAISE EXCEPTION 'Registration start must be before registration end';
    END IF;
    
    IF p_registration_window_end > p_date THEN
        RAISE EXCEPTION 'Registration must end before game starts';
    END IF;

    -- Insert the game with initial status
    INSERT INTO games (
        date,
        registration_window_start,
        registration_window_end,
        status,
        needs_completion,
        is_historical,
        teams_announced,
        completed,
        random_slots,
        max_players
    ) VALUES (
        p_date,
        p_registration_window_start,
        p_registration_window_end,
        'created',
        false,
        false,
        false,
        false,
        p_random_slots,
        p_max_players
    )
    RETURNING id INTO v_game_id;

    RETURN v_game_id;
END;
$$;
