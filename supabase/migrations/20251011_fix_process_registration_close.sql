-- =====================================================
-- Fix process_registration_close Function
-- =====================================================
-- This migration fixes the process_registration_close function which was
-- created incomplete in the shield token migration (20251002).
--
-- The function was missing the actual player selection logic, causing games
-- to have their status changed to 'players_announced' without actually
-- selecting any players.
--
-- DECISION: Keep the function minimal - it should only handle status updates
-- and shield processing. Player selection is handled in TypeScript via
-- handlePlayerSelection() for better maintainability and testability.
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_registration_close(
    p_game_id uuid,
    p_max_players integer,
    p_random_slots integer,
    p_bypass_permission boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_has_permission BOOLEAN;
    v_game_status TEXT;
BEGIN
    -- Permission check only if not bypassing
    IF NOT p_bypass_permission THEN
        SELECT EXISTS (
            SELECT 1 FROM players p
            JOIN admin_roles ar ON ar.player_id = p.id
            WHERE p.user_id = auth.uid()
        ) INTO v_has_permission;

        IF NOT v_has_permission THEN
            RAISE EXCEPTION 'User does not have permission to process registration close';
        END IF;
    END IF;

    -- Verify game is in correct status and update
    BEGIN
        SELECT status INTO v_game_status
        FROM games
        WHERE id = p_game_id
        FOR UPDATE;

        IF v_game_status != 'open' THEN
            RAISE EXCEPTION 'Game is not in open status (current: %)', v_game_status;
        END IF;

        -- Update game status to players_announced
        UPDATE games
        SET status = 'players_announced'
        WHERE id = p_game_id;

        -- Process shield streak protection after player selection
        -- Note: Player selection itself is handled in TypeScript via handlePlayerSelection()
        -- This function only handles the database state changes
        PERFORM process_shield_streak_protection(p_game_id);

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Registration close processed successfully (status updated and shield protection processed)'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE;
    END;
END;
$function$;

COMMENT ON FUNCTION process_registration_close IS 'Updates game status and processes shield protection. Player selection is handled in TypeScript for better maintainability.';

-- =====================================================
-- Migration Complete
-- =====================================================
