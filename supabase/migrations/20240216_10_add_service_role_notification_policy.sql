-- Drop existing service role policy if it exists
DROP POLICY IF EXISTS "Service role can manage all notifications" ON notifications;

-- Add policy for service role to manage all notifications
CREATE POLICY "Service role can manage all notifications"
ON notifications
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions to the service role
GRANT ALL ON notifications TO service_role;
