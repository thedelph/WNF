-- Create player_penalties table
CREATE TABLE player_penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id),
    game_id UUID NOT NULL REFERENCES games(id),
    penalty_type TEXT NOT NULL CHECK (penalty_type IN ('SAME_DAY_DROPOUT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_after_games INTEGER NOT NULL DEFAULT 5,
    games_remaining INTEGER NOT NULL DEFAULT 5,
    UNIQUE(player_id, game_id, penalty_type)
);

-- Add RLS policies
ALTER TABLE player_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own penalties"
    ON player_penalties
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = player_id
    ));

CREATE POLICY "Players can add same-day dropout penalties to themselves"
    ON player_penalties
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM players 
            WHERE id = player_id
        )
        AND penalty_type = 'SAME_DAY_DROPOUT'
    );

CREATE POLICY "Admins can manage penalties"
    ON player_penalties
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM admin_roles ar
            JOIN players p ON p.id = ar.player_id
            WHERE p.user_id = auth.uid()
            AND ar.is_super_admin = true
        )
    );
