-- Drop existing policies
DROP POLICY IF EXISTS "Allow users to read their own admin role" ON admin_roles;
DROP POLICY IF EXISTS "Allow users to read their own admin permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can view all permissions" ON admin_permissions;

-- Add RLS policies for admin_roles
CREATE POLICY "Enable read access for all users"
ON admin_roles FOR SELECT
TO authenticated
USING (true);

-- Add RLS policies for admin_permissions
CREATE POLICY "Enable read access for all users"
ON admin_permissions FOR SELECT
TO authenticated
USING (true);
