-- Drop existing functions and tables first
DROP FUNCTION IF EXISTS public.calculate_balanced_teams(UUID);
DROP FUNCTION IF EXISTS public.get_balanced_teams(UUID);
DROP TABLE IF EXISTS public.balanced_team_assignments;

-- Create table to cache team assignments
CREATE TABLE public.balanced_team_assignments (
    game_id UUID PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
    team_assignments JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attack_differential NUMERIC,
    defense_differential NUMERIC,
    total_differential NUMERIC,
    experience_differential NUMERIC
);

-- Grant access to authenticated users
ALTER TABLE public.balanced_team_assignments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.balanced_team_assignments TO authenticated;

CREATE POLICY "Enable read access for authenticated users" ON public.balanced_team_assignments
    FOR SELECT TO authenticated USING (true);

-- Add write policies for authenticated users
CREATE POLICY "Enable insert access for authenticated users" ON public.balanced_team_assignments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.balanced_team_assignments
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.balanced_team_assignments
    FOR DELETE TO authenticated USING (true);

-- Create function to calculate balanced teams
CREATE OR REPLACE FUNCTION public.calculate_balanced_teams(input_game_id UUID)
RETURNS TABLE (
    team text,
    player_id UUID,
    friendly_name text,
    attack_rating numeric,
    defense_rating numeric,
    experience_factor numeric
) SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    total_players integer;
    players_per_team integer;
BEGIN
    -- Get total number of confirmed players
    SELECT COUNT(*) INTO total_players
    FROM public.game_registrations gp
    WHERE gp.game_id = input_game_id AND gp.status = 'confirmed';

    -- Calculate players per team
    players_per_team := total_players / 2;

    RETURN QUERY
    WITH player_stats AS (
        SELECT 
            gp.player_id,
            p.friendly_name,
            COALESCE(ps.attack_rating, 0) as attack_rating,
            COALESCE(ps.defense_rating, 0) as defense_rating,
            -- Calculate experience factor based on caps and streaks
            (COALESCE(ps.caps, 0) * 0.1 + COALESCE(ps.current_streak, 0) * 0.05) as experience_factor,
            -- Calculate weighted total rating
            (COALESCE(ps.attack_rating, 0) + COALESCE(ps.defense_rating, 0)) * 
            (1 + (COALESCE(ps.active_bonuses, 0) * 0.1) - (COALESCE(ps.active_penalties, 0) * 0.1)) as weighted_rating
        FROM public.game_registrations gp
        JOIN public.players p ON p.id = gp.player_id
        LEFT JOIN public.player_stats ps ON ps.id = gp.player_id
        WHERE gp.game_id = input_game_id AND gp.status = 'confirmed'
    ),
    ranked_players AS (
        SELECT 
            *,
            ROW_NUMBER() OVER (
                ORDER BY weighted_rating DESC
            ) as rank
        FROM player_stats
    ),
    team_assignments AS (
        SELECT 
            CASE 
                -- Zigzag pattern for more balanced distribution
                WHEN rank % 4 IN (1, 4) THEN 'blue'
                ELSE 'orange'
            END as team,
            player_id,
            friendly_name,
            attack_rating,
            defense_rating,
            experience_factor
        FROM ranked_players
    )
    SELECT 
        ta.team,
        ta.player_id,
        ta.friendly_name,
        ta.attack_rating,
        ta.defense_rating,
        ta.experience_factor
    FROM team_assignments ta
    ORDER BY ta.team, (ta.attack_rating + ta.defense_rating) DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_balanced_teams(UUID) TO authenticated;

-- Create function to get balanced teams
CREATE OR REPLACE FUNCTION public.get_balanced_teams(game_id UUID)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    cached_results JSONB;
    calculated_teams JSONB;
BEGIN
    -- Check cache first
    SELECT team_assignments INTO cached_results
    FROM public.balanced_team_assignments bta
    WHERE bta.game_id = get_balanced_teams.game_id 
    AND bta.created_at > NOW() - INTERVAL '1 hour';

    IF FOUND THEN
        RETURN cached_results;
    END IF;

    -- Calculate teams if not in cache
    WITH calculated_assignments AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'team', t.team,
                    'player_id', t.player_id,
                    'friendly_name', t.friendly_name,
                    'attack_rating', t.attack_rating,
                    'defense_rating', t.defense_rating,
                    'experience_factor', t.experience_factor
                )
                ORDER BY t.team, (t.attack_rating + t.defense_rating) DESC
            ) as teams,
            SUM(CASE WHEN t.team = 'blue' THEN t.attack_rating ELSE 0 END) as blue_attack,
            SUM(CASE WHEN t.team = 'orange' THEN t.attack_rating ELSE 0 END) as orange_attack,
            SUM(CASE WHEN t.team = 'blue' THEN t.defense_rating ELSE 0 END) as blue_defense,
            SUM(CASE WHEN t.team = 'orange' THEN t.defense_rating ELSE 0 END) as orange_defense,
            SUM(CASE WHEN t.team = 'blue' THEN t.experience_factor ELSE 0 END) as blue_experience,
            SUM(CASE WHEN t.team = 'orange' THEN t.experience_factor ELSE 0 END) as orange_experience
        FROM public.calculate_balanced_teams(get_balanced_teams.game_id) t
    )
    SELECT 
        jsonb_build_object(
            'teams', teams,
            'stats', jsonb_build_object(
                'attack_differential', ABS(blue_attack - orange_attack),
                'defense_differential', ABS(blue_defense - orange_defense),
                'experience_differential', ABS(blue_experience - orange_experience),
                'total_differential', ABS(blue_attack + blue_defense - orange_attack - orange_defense),
                'blue_stats', jsonb_build_object(
                    'attack', blue_attack,
                    'defense', blue_defense,
                    'experience', blue_experience
                ),
                'orange_stats', jsonb_build_object(
                    'attack', orange_attack,
                    'defense', orange_defense,
                    'experience', orange_experience
                )
            )
        ) INTO calculated_teams
    FROM calculated_assignments;

    -- Cache the results
    INSERT INTO public.balanced_team_assignments (
        game_id, 
        team_assignments,
        attack_differential,
        defense_differential,
        total_differential,
        experience_differential
    )
    SELECT 
        get_balanced_teams.game_id,
        calculated_teams,
        (calculated_teams->'stats'->>'attack_differential')::numeric,
        (calculated_teams->'stats'->>'defense_differential')::numeric,
        (calculated_teams->'stats'->>'total_differential')::numeric,
        (calculated_teams->'stats'->>'experience_differential')::numeric;

    RETURN calculated_teams;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_balanced_teams(UUID) TO authenticated;
