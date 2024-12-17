-- Drop existing admin notification policies
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

-- Recreate the admin view policy with proper user_id check
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
