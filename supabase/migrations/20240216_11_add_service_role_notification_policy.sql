-- Drop existing service role policy if it exists
DROP POLICY IF EXISTS "Service role can manage notifications" ON notifications;

-- Add policy for service role to manage notifications
CREATE POLICY "Service role can manage notifications"
ON notifications
TO service_role
USING (true)
WITH CHECK (true);
