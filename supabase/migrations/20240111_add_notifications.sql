-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id),
    type TEXT NOT NULL CHECK (type IN ('GAME_SPOT_AVAILABLE')),
    message TEXT NOT NULL,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own notifications"
    ON notifications
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = player_id
    ));

CREATE POLICY "Players can update their own notifications"
    ON notifications
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = player_id
    ));
