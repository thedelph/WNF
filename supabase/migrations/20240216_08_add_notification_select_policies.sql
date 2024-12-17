-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add select policies for notifications

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Players can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Players can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update all notifications" ON notifications;
DROP POLICY IF EXISTS "Players can delete their notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete all notifications" ON notifications;

-- Add policy for players to view their own notifications
CREATE POLICY "Players can view their notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = player_id
    )
);

-- Add policy for admins to view all notifications
CREATE POLICY "Admins can view all notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
    )
);

-- Add policy for players to update their own notifications
CREATE POLICY "Players can update their notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = player_id
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = player_id
    )
);

-- Add policy for admins to update all notifications
CREATE POLICY "Admins can update all notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
    )
);

-- Add policy for players to delete their own notifications
CREATE POLICY "Players can delete their notifications"
ON notifications
FOR DELETE
TO authenticated
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = player_id
    )
);

-- Add policy for admins to delete all notifications
CREATE POLICY "Admins can delete all notifications"
ON notifications
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
    )
);
