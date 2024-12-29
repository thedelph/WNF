-- Update the create_game function to use the correct initial status
CREATE OR REPLACE FUNCTION create_game(
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
BEGIN
    -- Validate dates
    IF p_reg_start >= p_reg_end THEN
        RAISE EXCEPTION 'Registration start must be before registration end';
    END IF;
    
    IF p_reg_end > p_date THEN
        RAISE EXCEPTION 'Registration must end before game starts';
    END IF;

    -- Insert the game with explicit enum casting
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
        max_players,
        score_blue,
        score_orange,
        outcome
    ) VALUES (
        p_date,
        p_reg_start,
        p_reg_end,
        'open'::game_status,  -- Use the correct initial status
        true,
        false,
        false,
        false,
        p_random_slots,
        p_max_players,
        NULL,
        NULL,
        NULL
    )
    RETURNING id INTO v_game_id;

    RETURN v_game_id;
END;
$$;
