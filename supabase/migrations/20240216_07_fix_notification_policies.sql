-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Players can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

-- Add policy for players to create their own notifications
CREATE POLICY "Players can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM players 
        WHERE id = player_id
    )
    OR 
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
    )
);

-- Add policy for admins to create notifications for any player
CREATE POLICY "Admins can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM admin_roles ar
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
    )
);
