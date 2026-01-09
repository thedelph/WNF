-- Fix: Shield Token Protection Not Applied in XP v2 Calculation
-- Issue: calculate_player_xp_v2() was not checking for shield_active
-- and using the gradual decay formula for protected streaks.
--
-- Affected players: Joe (14-game streak), James H (15-game), Jack G (24-game)
-- All had shield_active=true but were getting 0% streak bonus instead of their protected bonus.
--
-- Root cause: XP v2 function was created without the shield integration from v1.0.4
-- The v1 calculate_player_xp() was updated in 20251009 but v2 was never updated.

CREATE OR REPLACE FUNCTION public.calculate_player_xp_v2(p_player_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_base_xp DECIMAL;
    v_streak_modifier DECIMAL;
    v_reserve_modifier DECIMAL;
    v_registration_modifier DECIMAL;
    v_unpaid_games_modifier DECIMAL;
    v_total_modifier DECIMAL;
    v_reserve_xp DECIMAL;
    v_final_xp INTEGER;
    v_latest_game_number INTEGER;
    v_current_streak INTEGER;
    v_shield_active BOOLEAN;
    v_protected_streak INTEGER;
    v_effective_streak INTEGER;
BEGIN
    -- Get the latest game number from ALL games
    SELECT MAX(sequence_number) INTO v_latest_game_number FROM games WHERE completed = true;

    -- ============================================
    -- V2 CHANGE #1: Linear Base XP Decay
    -- Formula: GREATEST(1, 20 - (games_ago * 0.5))
    -- 0 games ago = 20 XP
    -- 38 games ago = 1 XP
    -- 39+ games ago = 1 XP (floor)
    -- ============================================
    WITH player_games AS (
        SELECT
            g.id,
            g.sequence_number,
            gr.status,
            (v_latest_game_number - g.sequence_number) as games_ago
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        WHERE gr.player_id = p_player_id
        AND g.completed = true
        AND gr.status = 'selected'
        ORDER BY g.sequence_number DESC
    ),
    game_weights AS (
        SELECT
            id,
            sequence_number,
            games_ago,
            -- V2: Linear decay with floor at 1 XP
            GREATEST(1.0, 20.0 - (games_ago * 0.5)) as weight
        FROM player_games
    )
    SELECT COALESCE(SUM(weight), 0)
    INTO v_base_xp
    FROM game_weights;

    -- Calculate reserve XP (5 XP per reserve game, same as v1 but no 40-game cutoff since linear decay handles it)
    WITH reserve_games AS (
        SELECT
            g.sequence_number,
            (v_latest_game_number - g.sequence_number) as games_ago
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        WHERE gr.player_id = p_player_id
        AND gr.status = 'reserve'
        AND g.completed = true
        AND (gr.late_reserve = false OR gr.late_reserve IS NULL)
    )
    SELECT COALESCE(COUNT(*) * 5, 0)
    INTO v_reserve_xp
    FROM reserve_games
    WHERE games_ago < 40;  -- Keep 40 game limit for reserve XP

    -- Add reserve XP to base XP before multipliers
    v_base_xp := v_base_xp + v_reserve_xp;

    -- ============================================
    -- SHIELD INTEGRATION (v1.0.4 / v1.1.0)
    -- Get current streak AND shield status for calculations
    -- If shield is active, use gradual decay formula:
    -- effective_streak = MAX(current_streak, protected_streak - current_streak)
    -- ============================================
    SELECT
        COALESCE(current_streak, 0),
        COALESCE(shield_active, false),
        protected_streak_value
    INTO v_current_streak, v_shield_active, v_protected_streak
    FROM players
    WHERE id = p_player_id;

    -- Calculate effective streak (with shield protection if active)
    IF v_shield_active AND v_protected_streak IS NOT NULL THEN
        -- Gradual decay formula: protected bonus decreases as natural streak increases
        -- Effective streak = MAX(natural streak, decaying protected bonus)
        v_effective_streak := GREATEST(
            v_current_streak,
            v_protected_streak - v_current_streak
        );
    ELSE
        v_effective_streak := v_current_streak;
    END IF;

    -- ============================================
    -- V2 CHANGE #2: Diminishing Streak Returns
    -- Uses v_effective_streak (accounts for shield protection)
    -- 1 game: +10% (total: 10%)
    -- 2 games: +9% (total: 19%)
    -- 3 games: +8% (total: 27%)
    -- ...
    -- 10 games: +1% (total: 55%)
    -- 11+ games: +1% each (total: 55% + (streak-10)%)
    -- ============================================
    SELECT
        CASE
            WHEN v_effective_streak <= 0 THEN 0
            WHEN v_effective_streak <= 10 THEN
                -- Sum of (11-i) for i from 1 to streak
                -- Formula: streak * 11 - (streak * (streak + 1)) / 2
                (v_effective_streak * 11.0 - (v_effective_streak * (v_effective_streak + 1)) / 2.0) / 100.0
            ELSE
                -- 55% + 1% for each game beyond 10
                (55.0 + (v_effective_streak - 10)) / 100.0
        END
    INTO v_streak_modifier;

    -- Bench warmer modifier: +5% per consecutive reserve (UNCHANGED - stays linear)
    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM game_registrations gr
                JOIN games g ON g.id = gr.game_id
                WHERE gr.player_id = p_player_id
                AND g.sequence_number = v_latest_game_number
                AND gr.status = 'reserve'
                AND (gr.late_reserve = false OR gr.late_reserve IS NULL)
            ) THEN COALESCE(
                (SELECT bench_warmer_streak * 0.05 FROM players WHERE id = p_player_id),
                0.05
            )
            ELSE 0
        END
    INTO v_reserve_modifier;

    -- Registration streak modifier: +2.5% per streak if bonus applies (UNCHANGED - stays linear)
    SELECT COALESCE(
        CASE
            WHEN bonus_applies THEN current_streak_length * 0.025
            ELSE 0
        END,
        0
    )
    INTO v_registration_modifier
    FROM players p
    LEFT JOIN player_current_registration_streak_bonus rs ON rs.friendly_name = p.friendly_name
    WHERE p.id = p_player_id;

    -- Unpaid games modifier: -50% per unpaid game (UNCHANGED)
    WITH unpaid_games AS (
        SELECT COUNT(*) as unpaid_count
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        WHERE gr.player_id = p_player_id
        AND gr.paid = false
        AND g.completed = true
        AND gr.status = 'selected'
        AND gr.status != 'dropped_out'
        AND date_trunc('day', g.date + INTERVAL '1 day') <= date_trunc('day', NOW())
    )
    SELECT COALESCE(unpaid_count * -0.5, 0)
    INTO v_unpaid_games_modifier
    FROM unpaid_games;

    -- Calculate total modifier by combining all modifiers
    v_total_modifier := 1 + v_streak_modifier + v_reserve_modifier + v_registration_modifier + v_unpaid_games_modifier;

    -- Calculate final XP and ensure it's never negative
    v_final_xp := GREATEST(0, ROUND(v_base_xp * v_total_modifier));

    RETURN v_final_xp;
END;
$function$;

-- Recalculate all XP with the fixed function
SELECT recalculate_all_player_xp_v2();
