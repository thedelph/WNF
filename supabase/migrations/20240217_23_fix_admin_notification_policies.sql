-- Drop existing notification policies
DROP POLICY IF EXISTS "Players can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

-- Create policy for players to view their own notifications
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
    OR
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN admin_permissions ap ON ap.admin_role_id = ar.id
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
        AND ap.permission = 'manage_games'
    )
);

-- Add policy for admins to view notifications
CREATE POLICY "Admins can view all notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN admin_permissions ap ON ap.admin_role_id = ar.id
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
        AND ap.permission = 'manage_games'
    )
);

-- Ensure notifications table has RLS enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
